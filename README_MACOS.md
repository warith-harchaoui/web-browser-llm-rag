# 🍎 macOS Setup Guide for wllama TinyLlama Chat

This guide covers setup for macOS (Intel and Apple Silicon).

## 🛠️ Prerequisites

We recommend using **Homebrew** to manage packages.

1.  **Install Homebrew** (if not installed):
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```

2.  **Install Dependencies**:
    ```bash
    brew install node python git
    ```

## 🚀 Installation Steps

git@github.com:warith-harchaoui/web-browser-llm-rag.git

### 1. Clone the Repository
Open **Terminal** and run:
```bash
git clone git@github.com:warith-harchaoui/web-browser-llm-rag.git

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

### `icu4c` or Library Linking Errors
If you see errors related to `dyld: Library not loaded` or `icu4c` when running Node:
```bash
brew reinstall node
```

### Permission Denied
If you cannot run the download script:
```bash
chmod +x download-model.sh
```
