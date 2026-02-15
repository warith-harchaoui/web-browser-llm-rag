#!/bin/bash
# @file download-model.sh
# @description Hardened model downloading script for GGUF models.
# @author Warith Harchaoui

# Automatic model downloader for web-browser-llm-rag
# Downloads a curated set of high-quality GGUF models optimized for browser usage.

DEST_DIR="public/models"
mkdir -p "$DEST_DIR"

echo "--------------------------------------------------"
echo "🚀 GGUF Model Downloader (Downloading All)"
echo "--------------------------------------------------"

function download() {
    local name=$1
    local url=$2
    local filename=$3
    
    if [ -f "$DEST_DIR/$filename" ]; then
        echo "⏩ $name already exists, skipping."
        return
    fi

    echo "📥 Downloading $name..."
    if curl -L -f -o "$DEST_DIR/$filename" "$url"; then
        # Basic check to ensure it's not a tiny error file
        local size=$(wc -c <"$DEST_DIR/$filename" 2>/dev/null | tr -d ' ')
        if [ "$size" -lt 1000 ]; then
            echo "❌ Error: Downloaded file for $name is too small ($size bytes). Likely an error page."
            rm "$DEST_DIR/$filename"
        else
            echo "✅ Success! Saved to $DEST_DIR/$filename"
        fi
    else
        echo "❌ Error: Download failed for $name (curl error)."
    fi
}

# Model URLs (High-quality GGUF quantizations)
TINY_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
LLAMA_URL="https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"
QWEN_URL="https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf"
PHI_URL="https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"
DANUBE_URL="https://huggingface.co/h2oai/h2o-danube3-500m-chat-GGUF/resolve/main/h2o-danube3-500m-chat-v1.Q4_K_M.gguf"

# Execute downloads
download "TinyLlama" "$TINY_URL" "tinyllama-q4.gguf"
download "Llama 3.2" "$LLAMA_URL" "llama-3.2-1b-q4.gguf"
download "Qwen 2.5" "$QWEN_URL" "qwen-2.5-1.5b-q4.gguf"
download "Phi 3.5" "$PHI_URL" "phi-3.5-mini-q4.gguf"

echo "--------------------------------------------------"
echo "✅ All downloads complete. Models are in $DEST_DIR"
echo "--------------------------------------------------"
