/**
 * @file main.js
 * @description Main application logic for the Web Browser LLM RAG.
 * @author Warith Harchaoui
 */
import { Wllama, LoggerWithoutDebug } from "@wllama/wllama";
import * as pdfjsLib from "pdfjs-dist";

// Set PDF.js worker path to a stable static location
pdfjsLib.GlobalWorkerOptions.workerSrc = "/wllama/pdf.worker.min.mjs";

/**
 * Configuration for wllama assets.
 * 
 * CRITICAL PERFORMANCE NOTE: 
 * Multi-thread WASM requires Cross-Origin-Opener-Policy (COOP) and 
 * Cross-Origin-Embedder-Policy (COEP) headers. These enable SharedArrayBuffer
 * support in the browser, allowing the LLM to use multiple CPU cores.
 */
const WLLAMA_ASSETS = {
  "single-thread/wllama.wasm": new URL("/wllama/single-thread/wllama.wasm", window.location.origin).href,
  "multi-thread/wllama.wasm": new URL("/wllama/multi-thread/wllama.wasm", window.location.origin).href,
};

/** Default model path. TinyLlama-1.1B is ideal for browser memory limits. */
const MODEL_URL = "/models/tinyllama-q4.gguf";

// --- DOM Elements ---
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const btnLoad = document.getElementById("btnLoad");
const btnSend = document.getElementById("btnSend");
const btnStop = document.getElementById("btnStop");
const btnUploadPdf = document.getElementById("btnUploadPdf");
const pdfInput = document.getElementById("pdfInput");
const modelSelector = document.getElementById("modelSelector");
const statusEl = document.getElementById("status");
const warnEl = document.getElementById("warn");

// --- Global State ---
/** @type {Wllama|null} The active LLM runtime */
let wllama = null;
/** @type {AbortController|null} For cancelling generation */
let abortController = null;
/** @type {number} The current n_batch used by the engine */
let activeNBatch = 1024;

/** 
 * Local RAG Database: Stores processed document fragments.
 * Embeddings are stored as Float32Array for high-speed similarity calculation.
 */
let docState = {
  name: "",
  chunks: [],         // Array of text fragments
  embeddings: [],     // Array of vectors (Float32Array)
  modelUrl: "",       // Model used to generate these embeddings
};

/** 
 * Chat Session History. 
 * Initialized with a system prompt to define the assistant's persona.
 */
const messages = [
  {
    role: "system",
    content: "You are a helpful assistant. Keep answers concise. If unsure, say you are unsure.",
  },
];

/** Updates the system status in the UI */
function setStatus(s) {
  statusEl.textContent = s;
}

/** Sets or clears the warning message in the UI */
function setWarn(s) {
  warnEl.textContent = s || "";
}

/** Appends a message bubble to the chat window */
function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "assistant"}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

/**
 * Loads the LLM model into the WASM environment.
 * @param {number|null} forcedNBatch - Optional adaptive batch override.
 */
async function loadModel(forcedNBatch = null) {
  if (btnLoad.disabled && !wllama) return;

  // Determine the batch size to use for this session.
  // We use 1024 as a baseline, but the adaptive system can override this if a dense PDF is indexed.
  const batchToUse = forcedNBatch || 1024;
  activeNBatch = batchToUse;

  // If a model is already loaded, we must unload it before starting a new initialization.
  // This is vital for browser memory management, especially with 1B+ parameter models.
  if (wllama) {
    try {
      setStatus("Unloading previous model…");
      await wllama.exit();
    } catch (e) {
      console.warn("Error during model exit:", e);
    }
    wllama = null;
  }

  btnLoad.disabled = true;
  setWarn("");
  setStatus("Loading runtime…");

  try {
    const modelUrl = modelSelector.value;
    if (!modelUrl) throw new Error("No model selected.");

    wllama = new Wllama(WLLAMA_ASSETS, {
      logger: LoggerWithoutDebug,
      parallelDownloads: 3,
      allowOffline: true,
    });

    setStatus(`Loading ${modelUrl} (Batch=${batchToUse})…`);
    let finalUrl = modelUrl;
    if (finalUrl.startsWith("/")) {
      finalUrl = new URL(finalUrl, window.location.origin).href;
    }

    // Load the model weights and specify runtime parameters.
    // - n_ctx: The context window size (2048 handles conversational history + RAG).
    // - n_batch: The logical token processing window.
    // - n_ubatch: The physical token processing window. MUST be matched to n_batch for adaptive stability.
    // - embeddings: MUST be true to allow the .embeddings() call for RAG features.
    await wllama.loadModelFromUrl(finalUrl, {
      n_ctx: 2048,
      n_batch: batchToUse,
      n_ubatch: batchToUse,
      offload_kqv: false,
      embeddings: true,
    });

    const isolated = self.crossOriginIsolated ? "yes" : "no";
    const mt = wllama.isMultithread?.() ? "multi-thread" : "single-thread";
    setStatus(`Model ready (Isolated=${isolated}, Runtime=${mt}) ✅`);
    window.wllama_debug = wllama; // DEBUG HOOK

    // If a document was already loaded, its embeddings are now invalid
    if (docState.chunks.length > 0 && docState.modelUrl !== modelUrl) {
      docState.embeddings = [];
      setWarn("⚠️ Model switched. Please re-upload your PDF to re-index it for the new model.");
    }

    btnSend.disabled = false;
    inputEl.focus();
    btnLoad.disabled = false;
    btnLoad.textContent = "Switch model";
  } catch (err) {
    console.error(err);
    setStatus(`Load failed: ${err.message}`);
    btnLoad.disabled = false;
  }
}

/**
 * Refreshes the model list from the server.
 */
async function refreshModelList() {
  try {
    const resp = await fetch("/api/models");
    if (resp.ok) {
      const list = await resp.json();
      if (list && list.length > 0) {
        modelSelector.innerHTML = list.map(m => {
          const name = m.split("/").pop().replace(".gguf", "");
          return `<option value="${m}">${name}</option>`;
        }).join("");
      }
    }
  } catch (e) {
    console.warn("Could not fetch models:", e);
  }
}

btnLoad.onclick = loadModel;
window.addEventListener("DOMContentLoaded", async () => {
  await refreshModelList();
  await loadModel();
});

btnStop.onclick = () => {
  if (abortController) abortController.abort();
};

/**
 * Splits document text into overlapping, sentence-aware chunks.
 * 
 * DESIGN RATIONALE:
 * Character-based slicing often cuts sentences in half, leading into low-quality 
 * RAG results. This function attempts to find the nearest sentence break (period),
 * newline, or whitespace to ensure that each fragment is semantically coherent.
 * The 'overlap' ensures that context is maintained between consecutive fragments.
 */
function chunkText(text, size = 600, overlap = 100) {
  const chunks = [];
  let i = 0;

  while (i < text.length) {
    let end = i + size;
    if (end < text.length) {
      // Seek a logical break point within a small window at the end of the chunk.
      const searchWindow = text.substring(end - 100, end + 20);
      const breakIdx = searchWindow.lastIndexOf(". ") !== -1 ? searchWindow.lastIndexOf(". ") + 1 :
        searchWindow.lastIndexOf("\n") !== -1 ? searchWindow.lastIndexOf("\n") :
          searchWindow.lastIndexOf(" ");

      if (breakIdx !== -1) {
        end = (end - 100) + breakIdx + 1;
      }
    }

    chunks.push(text.substring(i, end).trim());
    i = end - overlap;
    if (i < 0) i = 0;

    // Safety exit: Prevent infinite loop if the chunk pointer fails to advance.
    if (end <= i + overlap && end < text.length) i = end;
  }

  // Filter out tiny fragments (usually artifacts of the splitting logic).
  return chunks.filter(c => c.length > 10);
}

/**
 * Standard Cosine Similarity for vector comparison.
 */
function cosineSimilarity(v1, v2) {
  let dot = 0;
  let m1 = 0;
  let m2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    m1 += v1[i] * v1[i];
    m2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(m1) * Math.sqrt(m2));
}

/**
 * Validates and splits chunks concurrently to fit within token limits.
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to run on each item
 * @param {number} limit - Max concurrent tasks
 * @returns {Promise<Array>} - Results of all tasks
 */
async function runConcurrent(items, fn, limit) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = fn(item);
    results.push(p);
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

btnUploadPdf.onclick = () => pdfInput.click();

/**
 * UI Handler: Extracts text from a PDF, chunks it, and generates embeddings locally.
 */
pdfInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !wllama) return;

  setStatus(`Extracting text from ${file.name}…`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(" ") + "\n";
    }

    const chunks = chunkText(fullText);
    setStatus(`Analyzing ${chunks.length} fragments…`);

    /**
     * SMART CHUNK SIZING (Recursive):
     * The Wllama library (v2.3.6) does not expose 'n_ubatch' in its config, 
     * forcing a hard physical limit of 512 tokens per batch. 
     * Instead of reloading the model (which fails), we must strictly ensure 
     * no chunk exceeds this limit by recursively splitting strictly based on token usage.
     */
    async function ensureChunkSize(text) {
      const tokens = await wllama.tokenize(text);
      // AGGRESSIVE SAFETY: Limit to 300 tokens to be well under the 512 physical limit.
      if (tokens.length <= 300) return [text];

      console.log(`RAG Debug: Chunk too large (${tokens.length} tokens). Splitting...`);
      const mid = Math.floor(text.length / 2);
      // Try to find a space near the middle to avoid cutting words
      const searchWindow = text.substring(mid - 50, mid + 50);
      const spaceRelative = searchWindow.lastIndexOf(" ");
      const splitIdx = spaceRelative !== -1 ? (mid - 50 + spaceRelative) : mid;

      const left = text.substring(0, splitIdx).trim();
      const right = text.substring(splitIdx).trim();

      // Recursively process both halves
      return [
        ...(left ? await ensureChunkSize(left) : []),
        ...(right ? await ensureChunkSize(right) : [])
      ];
    }

    // Process and validate all chunks
    // Process and validate all chunks concurrently
    // We use a concurrency limit (e.g., 4) to avoid overwhelming the tokenizer
    const results = await runConcurrent(chunks, ensureChunkSize, 4);
    const validatedChunks = results.flat();

    // Update chunks list with valid ones
    const finalChunks = validatedChunks.filter(c => c.length > 0);
    setStatus(`Indexing ${finalChunks.length} optimized fragments…`);

    // Ensure embeddings are enabled
    await wllama.setOptions({ embeddings: true });

    const embeddings = [];
    const safeChunks = [];

    // Recursive function to handle runtime embedding failures
    async function processChunkSafe(text) {
      try {
        const output = await wllama.embeddings(text);
        embeddings.push(output);
        safeChunks.push(text);
      } catch (err) {
        console.warn(`RAG Debug: Embedding failed for chunk ("${text.substring(0, 20)}..."). Reason: ${err.message}`);
        // If it fails (likely due to batch size), split it further and retry
        if (text.length < 10) return;

        console.log("RAG Debug: Splitting failing chunk and retrying...");
        const mid = Math.floor(text.length / 2);
        const left = text.substring(0, mid).trim();
        const right = text.substring(mid).trim();

        if (left) await processChunkSafe(left);
        if (right) await processChunkSafe(right);
      }
    }

    let completed = 0;
    // Sequential execution for embeddings to ensure stability (concurrency: 1)
    await runConcurrent(finalChunks, async (chunk) => {
      await processChunkSafe(chunk);
      completed++;
      setStatus(`Indexing: ${completed}/${finalChunks.length}…`);
    }, 1);

    docState = {
      name: file.name,
      chunks: safeChunks,
      embeddings,
      modelUrl: modelSelector.value,
    };
    setStatus(`Document loaded ✅ ${file.name} (${safeChunks.length} chunks)`);
  } catch (err) {
    console.error(err);
    setWarn(`PDF Error: ${err.message}`);
    setStatus("Ready ✅");
  }
};

/**
 * Performs a chat turn. Integrates RAG retrieval if a document is loaded.
 */
async function runChatTurn(userText) {
  let contextToInject = "";

  // 1. RAG Retrieval Step: Find context fragments relevant to the user's query.
  if (docState.chunks.length > 0 && wllama) {
    // Safety check: Ensure embeddings were successfully generated
    if (docState.embeddings.length === 0) {
      console.warn("RAG: Document loaded but no embeddings found. Skipping retrieval.");
      setWarn("⚠️ Context skipped: Please re-upload PDF to generate embeddings.");
    } else {
      try {
        console.log("RAG: Finding relevant documents...");
        await wllama.setOptions({ embeddings: true });
        const queryEmbedding = await wllama.embeddings(userText);

        const scores = docState.embeddings.map((emb, idx) => ({
          idx,
          score: cosineSimilarity(queryEmbedding, emb),
        }));

        // Sort by similarity and pick top 3
        scores.sort((a, b) => b.score - a.score);
        const top3 = scores.slice(0, 3);

        console.log("RAG: Top scores:", top3.map(s => s.score.toFixed(3)));

        contextToInject = "\nContext from document:\n" +
          top3.map(s => `--- DOCUMENT FRAGMENT ---\n${docState.chunks[s.idx]}`).join("\n") +
          "\n";
      } catch (err) {
        console.error("RAG Error during retrieval:", err);
        setWarn(`RAG Error: ${err.message}`);
      }
    }
  }

  // Inject retrieved context into the hidden prompt sent to the LLM
  const promptWithContext = userText + contextToInject;
  messages.push({ role: "user", content: promptWithContext });
  addMsg("user", userText);

  // 2. Inference Step: Generate the assistant's response.
  const assistantDiv = addMsg("assistant", "");
  setStatus("Assistant is thinking…");

  // Setup abort controller for the 'Stop' button functionality.
  abortController = new AbortController();
  btnStop.disabled = false;
  btnSend.disabled = true;

  let acc = "";
  const decoder = new TextDecoder();

  /**
   * DYNAMIC STATE TOGGLING:
   * llama.cpp based engines (like Wllama) can sometimes conflict when running 
   * both embeddings and generation in the same context window.
   * We explicitly disable the embedding engine here before starting the chat 
   * completion to ensure maximum stability and prevent runtime crashes.
   */
  if (wllama) {
    await wllama.setOptions({ embeddings: false });
  }

  try {
    const stream = await wllama.createChatCompletion(messages, {
      stream: true,
      useCache: true,      // Keeps past conversation context for faster multi-turn chat.
      nPredict: 512,       // Limit response to prevent excessive resource usage.
      abortSignal: abortController.signal,
      sampling: {
        temp: 0.2,         // Lower temperature for more factual/predictable answers.
        top_p: 0.9,
        penalty_repeat: 1.1
      },
    });

    /**
     * ROBUST STREAMING LOOP:
     * Different versions of llama.cpp/Wllama return text in different formats.
     * - 'piece': A Uint8Array delta (raw bytes).
     * - 'currentText': The full accumulated string so far.
     * We support both to ensure that text is displayed as soon as it's available.
     */
    console.log("RAG Debug: Stream object received. Iterating...");
    for await (const chunk of stream) {
      if (chunk.piece && chunk.piece.length > 0) {
        // Decode raw bytes into UTF-8 characters.
        acc += decoder.decode(chunk.piece, { stream: true });
      } else if (chunk.currentText !== undefined && chunk.currentText.length > acc.length) {
        // Fallback for full-string delivery.
        acc = chunk.currentText;
      }

      // Update UI in real-time as tokens arrive.
      if (acc.length > 0) {
        assistantDiv.textContent = acc;
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    }

    /**
     * FINAL FALLBACK MECHANISM:
     * Some older or very small models (like TinyLlama) might fail to yield stream
     * events during high system load. If the stream ends empty, we try a 
     * non-streaming completion as a final effort to retrieve a response.
     */
    if (acc.length === 0 && !abortController.signal.aborted) {
      console.warn("RAG Debug: Stream yielded zero text. Attempting non-streaming fallback...");
      const fallback = await wllama.createChatCompletion(messages, {
        stream: false,
        nPredict: 128,
        sampling: { temp: 0.1 },
      });
      acc = fallback;
      assistantDiv.textContent = acc;
    }

    console.log("RAG Debug: Final Response Length:", acc.length);

    // Store the final response in the session history.
    messages.push({ role: "assistant", content: acc });
  } catch (err) {
    if (abortController?.signal?.aborted) {
      // Gracefully handle manual cancellations.
      assistantDiv.textContent = acc + "\n\n[stopped]";
      messages.push({ role: "assistant", content: acc });
    } else {
      // Report unexpected runtime errors.
      assistantDiv.textContent = `Error: ${err.message}`;
    }
  } finally {
    abortController = null;
    setStatus("Ready ✅");
    btnStop.disabled = true;
    btnSend.disabled = false;
    inputEl.focus();
  }
}

btnSend.onclick = async () => {
  const text = inputEl.value.trim();
  if (!text || !wllama) return;
  inputEl.value = "";
  await runChatTurn(text);
};

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    btnSend.click();
  }
});
