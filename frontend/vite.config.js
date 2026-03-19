import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  plugins: [react()],

  // Tauri needs a defined port to connect its webview
  server: {
    port:        3000,
    strictPort:  true,      // fail if port is taken (Tauri expects this port)
    host:        isTauri ? "localhost" : true,
    proxy: !isTauri ? {
      "/api": {
        target:       process.env.VITE_API_URL || "http://localhost:8000",
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/api/, ""),
      },
    } : undefined,
  },

  // Required for Tauri — prevents asset path issues in the webview
  base: isTauri ? "/" : "./",

  build: {
    // Tauri uses Chromium/WebKit — no need to target old browsers
    target: isTauri ? ["chrome105", "safari15"] : "modules",
    // Smaller sourcemaps for desktop
    sourcemap: !isTauri,
  },
});
