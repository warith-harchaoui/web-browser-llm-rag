/**
 * @file vite.config.js
 * @author Warith Harchaoui
 */
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "@wllama/wllama": path.resolve(__dirname, "node_modules/@wllama/wllama/esm/index.js"),
        },
    },
    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
    },
    optimizeDeps: {
        exclude: ["@wllama/wllama"],
    },
});
