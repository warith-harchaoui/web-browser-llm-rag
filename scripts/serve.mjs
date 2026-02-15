/**
 * @file serve.mjs
 * @description A minimal static HTTP server for the production build (/dist).
 * It provides the required Cross-Origin Isolation headers for multi-threaded WASM
 * and includes a simple API endpoint for model auto-detection.
 * @author Warith Harchaoui
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Root directory containing the production build assets. */
const root = path.resolve(__dirname, "..", "dist");

/** 
 * MIME types for common web assets. 
 * - .gguf: Used for large language model weights. Must be served as octet-stream.
 * - .wasm: The compiled C++ logic of llama.cpp. Must have application/wasm type.
 * - .json: Used for model catalogs and metadata.
 */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".gguf": "application/octet-stream",
};

/**
 * Creates and starts the HTTP server.
 * Listens on port 5173 by default.
 */
http
  .createServer((req, res) => {
    /** 
     * CRITICAL: Set COOP and COEP headers.
     * These are required by browsers to enable SharedArrayBuffer, 
     * which in turn allows multi-threaded WebAssembly execution.
     */
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    // Clean the URL path by removing query strings
    const urlPath = (req.url || "/").split("?")[0];

    /**
     * API ENDPOINT: /api/models
     * Scans the /dist/models directory for .gguf files.
     * Returns a JSON array of relative paths.
     */
    if (urlPath === "/api/models") {
      const modelsDir = path.join(root, "models");
      let models = [];
      if (fs.existsSync(modelsDir)) {
        models = fs.readdirSync(modelsDir)
          .filter(f => f.endsWith(".gguf"))
          .map(f => `/models/${f}`);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(models));
      return;
    }

    /** 
     * Static file handling logic.
     * Maps the URL path to a file in the /dist directory.
     */
    const filePath = path.join(root, urlPath === "/" ? "index.html" : urlPath);

    // Security: Prevent Directory Traversal attacks
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    // Check if the requested file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // Stream the file back to the client with the correct MIME type
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(5173, () => {
    console.log("--------------------------------------------------");
    console.log("🚀 Production Preview Server");
    console.log("📍 URL: http://localhost:5173");
    console.log("--------------------------------------------------");
  });
