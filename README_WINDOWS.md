# 🪟 Windows Setup Guide for wllama TinyLlama Chat

This guide will help you set up the project on Windows 10/11 using **Git Bash** for the best compatibility.

## 🛠️ Prerequisites

1.  **Git for Windows**: [Download Here](https://git-scm.com/download/win)
    *   *Important*: During installation, ensure you select the option to install **Git Bash**.
2.  **Node.js (LTS)**: [Download Here](https://nodejs.org/)
    *   Download the "LTS" version.
3.  **Python 3**: [Download Here](https://www.python.org/downloads/)
    *   *Critical*: Check the box **"Add Python to PATH"** during installation.

## 🚀 Installation Steps

### 1. clone the Repository
Open **Git Bash** (Right-click in your folder -> "Open Git Bash here") and run:
```bash
git clone <repository-url>
cd wllama-tinyllama-chat
```

### 2. Download Models
We use a shell script to download models safely. Run this in **Git Bash**:
```bash
# Make the script executable (if needed)
chmod +x download-model.sh

# Run the downloader
./download-model.sh
```
*Note: This will download several GGUF models (~2-3 GB total) to `public/models/`.*

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

### "Script execution disabled" (PowerShell errors)
If you try to use PowerShell instead of Git Bash, you might see execution policy errors. We strongly recommend using **Git Bash** to run the `.sh` scripts natively.

### "Python not found"
Ensure you checked **"Add Python to PATH"** during the Python installation. You may need to restart your computer after installing Python.

### Firewall Warnings
Windows Defender Firewall may ask for permission when Node.js tries to open a port (5173). Click **"Allow Access"**.
