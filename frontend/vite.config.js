import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    // Remove all console.* calls in production builds
    minify: "esbuild",
    target: "es2020",
    sourcemap: false,

    rollupOptions: {
      output: {
        // Split large vendor bundles into separate cacheable chunks
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["lucide-react", "react-hot-toast", "react-markdown"],
          "vendor-network": ["axios"],
          "vendor-export": ["docx", "file-saver", "jszip", "pptxgenjs", "xlsx"],
        },
      },
    },

    // Warn on chunks > 500 kB
    chunkSizeWarningLimit: 500,
  },

  esbuild: {
    // Strip console.log/warn/info/debug in production; keep console.error
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
});

