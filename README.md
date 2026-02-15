# Web Browser LLM RAG

A professional-grade, high-performance chat application that runs Large Language Models fully **locally in the browser**. Powered by **wllama** (a WebAssembly binding for [llama.cpp](https://github.com/ggerganov/llama.cpp)).

## 🌟 Core Features

- 💻 **100% Privacy**: All processing occurs locally. No data ever leaves your browser.
- ⚙️ **CPU-Exclusive**: Forced CPU inference via WebAssembly, ensuring accessibility on devices without dedicated GPUs.
- ⚡ **Multi-thread Performance**: Leverages `SharedArrayBuffer` for significant speedups on modern multicore processors.
- 📄 **PDF RAG**: Upload and chat with PDF documents using local vector embeddings (powered by `pdfjs-dist`).
- 📦 **Dynamic Multi-Model Support**: Hot-swap between different GGUF models (Llama 3.2, Qwen 2.5, Phi 3.5, etc.) in real-time.
- 🛠️ **AI Tooling Ecosystem**: Includes built-in Python utilities for model analysis and quantization with runtime resource hinting.

---

## 🚀 Quick Start

### 1. Environment Setup (Node.js 18+)
If you encounter environment issues on macOS (e.g., `icu4c` linking errors), run:
```bash
brew reinstall node
```

### 2. Download Models (Hardened)
We provide an automated, robust script to download a curated set of high-quality, browser-optimized models. It includes verification checks to ensure files are not corrupted during transit:
```bash
chmod +x download-model.sh
./download-model.sh
```
This will populate `public/models/` with models like **Llama 3.2 1B**, **Qwen 2.5 1.5B**, and **Phi 3.5 Mini**.

### 3. Install & Launch
```bash
npm install
npm run build
npm run preview
```
Visit `http://localhost:5173` to start chatting.

---

## 📘 Detailed Guides

### PDF RAG (Retrieval-Augmented Generation)
Chat with your own documents using local vector search:
1. **Load a Model**: Select your preferred model and click "Load model".
2. **Upload PDF**: Use the "Upload PDF (RAG)" button.
3. **Indexing**: The system extracts text and generates embeddings token-by-token in your browser.
4. **Interact**: Ask questions about the document. The system retrieves relevant fragments to ground the assistant's response. **Note**: The system automatically manages your embedding engine's state to ensure seamless transitions between retrieval and chat response.

> [!IMPORTANT]
> **Model Consistency**: Vector embeddings are model-specific. If you switch models, you must re-upload/re-index your PDF to ensure the search remains accurate for the new model's latent space.

### Multi-Model Selection
The application automatically scans your `models/` directory.
- **Select**: Use the dropdown menu to choose between downloaded models.
- **Unload**: Switching models automatically exits the previous runtime to preserve RAM (optimized for 4GB RAM devices).

### Tuning Performance
You can adjust these settings in `src/main.js` to match your hardware:
- `n_ctx`: Context window size (Default: 2048). Optimized for stable RAG performance. Lower to 1024 or 512 for extremely low memory devices.
- `nPredict`: Max response length (Default: 512). Lower for faster generation.
- `offload_kqv: false`: Enforces CPU usage for maximum stability.

---

## 🛠️ AI Development Tools
Located in the `ai/` folder, these tools help you analyze and optimize GGUF models.

```bash
# Setup via Conda
conda env create -f ai/environment.yml
conda activate wllama-ai-tools

# OR Setup via Pip
pip install -r ai/requirements.txt
```
# Inspect model metadata
python3 ai/compress.py public/models/tinyllama-q4.gguf --info

# Perform quantization
python3 ai/compress.py path/to/model.gguf --method q4_k_m
*For more details, see [ai/README.md](./ai/README.md).*

---

## 🔧 Troubleshooting

- **"Load failed"**: Check the console. Ensure your models have the `.gguf` extension and are inside the `public/models/` folder.
- **Single-thread fallback**: If the status says `Isolated=no`, your server isn't providing the required COOP/COEP headers. Use `npm run dev` or `npm run preview`.
- **Repetition/Looping**: We use a `penalty_repeat: 1.2` by default. If the model loops, try starting a new chat or switching to a more capable model like Llama 3.2.

---

## 📜 License
NO LICENSE - Provided as-is.

## 🙏 Credits
- **wllama**: [ngxson/wllama](https://github.com/ngxson/wllama)
- **llama.cpp**: [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp)
- **PDF.js**: [mozilla/pdf.js](https://github.com/mozilla/pdf.js)
