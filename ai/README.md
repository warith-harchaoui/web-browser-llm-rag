# AI Tools: GGUF Model Preparation

A suite of high-quality utilities for analyzing and optimizing Large Language Models (GGUF) for browser-based inference.

## 🧠 Why Optimization Matters

Web browsers are inherently RAM-constrained. Standard models are often too large to fit into the browser's memory heap (~4GB). **Quantization** (compressing 16-bit floats to 4-bit integers) is the essential bridge that makes real-world local LLMs possible in the browser.

## 🛠️ Included Utilities

### 🔍 `compress.py --info`
Provides architectural insights into any GGUF file:
- **Architecture**: Detects the base model family (Llama, Qwen, Phi, etc.).
- **Quantization Type**: Verifies the bit-depth and method (e.g., Q4_K_M).
- **Technical Specs**: Displays context window size (sequence length) and parameter counts.

### 📉 `compress.py --method`
An automated pipeline for high-performance quantization. It leverages `llama-cpp-python` or native `llama.cpp` binaries to transcode models.

**Recommended Methods for Web Projects:**
- **`q4_k_m`**: **Recommended.** The sweet spot for speed and intelligence.
- **`q5_k_m`**: Better reasoning, requires ~25% more memory.
- **`q8_0`**: Almost zero loss, but very slow and memory-intensive in browsers.

---

## ⚡ Setup & Installation

### Option A: Using Conda (Recommended)
Create and activate the environment using the provided `environment.yml`:
```bash
conda env create -f ai/environment.yml
conda activate wllama-ai-tools
```

### Option B: Using Pip
```bash
# Install dependencies
pip install -r ai/requirements.txt
```

### macOS Performance (Metal Accelerated)
To accelerate quantization using your Mac's GPU (Metal):
```bash
CMAKE_ARGS="-DGGML_METAL=on" pip install llama-cpp-python
```

---

## 📖 Usage Examples

### Analyze a model's suitability
```bash
python3 ai/compress.py ../public/models/llama-3.2-1b-q4.gguf --info
```

### Quantize an original model for web deployment
```bash
# Automates the Q4_K_M quantization of a raw GGUF
python3 ai/compress.py my-raw-model.gguf --output ./web-ready.gguf --method q4_k_m

## 🔋 Runtime Resource Hints

The `compress.py` utility allows you to specify target resource limits that are embedded (as hints) for the runtime LLM engine.

- **`--max-threads` / `-t`**: Specifies the **runtime** number of CPU threads the LLM engine should utilize for inference. This ensures the chat app remains performant without saturating your entire system.
- **`--max-ram` / `-r`**: Specifies the **runtime** RAM memory limit (in GB) for the LLM engine. This is used by the system to manage large models and prevent out-of-memory crashes during browser execution.

> [!NOTE]
> While these arguments previously controlled the quantization process, they are now optimized to guide the **web application's** execution environment for maximum stability on consumer hardware.
