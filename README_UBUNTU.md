# 🐧 Ubuntu / Linux Setup Guide for web browser LLM RAG

This guide covers setup for Ubuntu (20.04+) and Debian-based distributions.

## 🛠️ Prerequisites

Update your package list and install core dependencies:

```bash
sudo apt update
sudo apt install -y git nodejs npm python3 python3-pip curl
```

*Note: If the `nodejs` version provided by `apt` is too old (older than v18), consider using `nodesource` or `nvm`.*

**Recommended (Node.js 20 LTS via NodeSource):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 🚀 Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd web-browser-llm-rag
```

### 2. Download Models
```bash
# Make the script executable
chmod +x download-model.sh

# Run the downloader
./download-model.sh
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build and Run
```bash
npm run build
npm run preview
```

Access the app at: **`http://localhost:5173`**

---

## 🔧 Troubleshooting

### "EACCES: permission denied"
If `npm install` throws permission errors, avoid using `sudo`. Instead, fix your npm permissions or use a Node version manager like `nvm` (recommended).

### Port 5173 in use
If the server fails to start, kill any stale processes:
```bash
lsof -i :5173
kill -9 <PID>
```
