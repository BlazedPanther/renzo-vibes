import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

// Statischer Build für GitHub Pages. Root-Pfad ("/") für eigene Domain;
// BASE_PATH=/Rent2Wipes/ ermöglicht eine Vorschau unter github.io/<user>/Rent2Wipes/.
export default defineConfig({
  base: process.env["BASE_PATH"] ?? "/",
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: false }), react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  build: { outDir: "dist", sourcemap: false },
});
