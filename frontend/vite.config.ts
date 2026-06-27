import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    !process.env.VITE_WEB_ONLY && electron([
      {
        entry: "src/main/main.ts",
      },
      {
        entry: "src/preload/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            lib: {
              entry: "src/preload/preload.ts",
              formats: ["cjs"],
            },
            rollupOptions: {
              output: {
                entryFileNames: "preload.js",
              },
            },
          },
        },
      },
    ]),
    !process.env.VITE_WEB_ONLY && renderer(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
