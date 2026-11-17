// Study 1 build (see study1/main.jsx): a static single-player page for Qualtrics.
//   npm run dev:study1    -> http://localhost:8855/study1.html?arm=B019_selective_R1
//   npm run build:study1  -> static files in dist-study1/ (index.html opens the game)
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "./",
  server: { port: 8855, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist-study1", emptyOutDir: true, rollupOptions: { input: here("./study1.html") } },
  plugins: [UnoCSS(), react()],
});
