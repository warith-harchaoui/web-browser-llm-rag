/**
 * @file copy-wllama-assets.mjs
 * @description Copies prebuilt wllama and PDF.js assets into /public/wllama.
 * @author Warith Harchaoui
 */
import { mkdirSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const src = path.join(root, "node_modules", "@wllama", "wllama", "esm");
const dst = path.join(root, "public", "wllama");

// 1. Copy Wllama Core Assets
// These files (wasm, workers, and esm modules) are the heart of the engine.
// They must be accessible in the /public directory for the browser to fetch them.
if (!existsSync(src)) {
  console.error("Cannot find wllama dist folder at:", src);
  process.exit(1);
}
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log("✅ Copied wllama assets to", dst);

// 2. Copy PDF.js Worker Assets
const pdfSrc = path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
if (existsSync(pdfSrc)) {
  cpSync(pdfSrc, path.join(dst, "pdf.worker.min.mjs"));
  console.log("✅ Copied PDF.js worker to", dst);
} else {
  console.warn("⚠️ PDF.js worker not found at:", pdfSrc);
}

console.log("🚀 All assets successfully prepared.");
