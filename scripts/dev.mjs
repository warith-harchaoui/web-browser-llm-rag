import { createServer } from "vite";

/**
 * @file dev.mjs
 * @description Custom development server for Vite with COOP/COEP headers.
 * @author Warith Harchaoui
 */
const server = await createServer({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [
    {
      name: "model-list",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/api/models") {
            const fs = await import("node:fs");
            const path = await import("node:path");
            const modelsDir = path.resolve(process.cwd(), "public", "models");
            let models = [];
            if (fs.existsSync(modelsDir)) {
              models = fs.readdirSync(modelsDir)
                .filter(f => f.endsWith(".gguf"))
                .map(f => `/models/${f}`);
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(models));
            return;
          }
          next();
        });
      },
    },
  ],
});

await server.listen();
server.printUrls();
