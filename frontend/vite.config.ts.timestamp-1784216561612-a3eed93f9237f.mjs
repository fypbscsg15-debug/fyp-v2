// vite.config.ts
import { defineConfig } from "file:///C:/Users/Qasim%20Majid/Desktop/final%20working/fyp-v2/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Qasim%20Majid/Desktop/final%20working/fyp-v2/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Qasim%20Majid/Desktop/final%20working/fyp-v2/frontend/node_modules/lovable-tagger/dist/index.js";
import electron from "file:///C:/Users/Qasim%20Majid/Desktop/final%20working/fyp-v2/frontend/node_modules/vite-plugin-electron/dist/index.mjs";
import renderer from "file:///C:/Users/Qasim%20Majid/Desktop/final%20working/fyp-v2/frontend/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\Qasim Majid\\Desktop\\final working\\fyp-v2\\frontend";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    !process.env.VITE_WEB_ONLY && electron([
      {
        entry: "src/main/main.ts"
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
              formats: ["cjs"]
            },
            rollupOptions: {
              output: {
                entryFileNames: "preload.js"
              }
            }
          }
        }
      }
    ]),
    !process.env.VITE_WEB_ONLY && renderer()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src/renderer")
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxRYXNpbSBNYWppZFxcXFxEZXNrdG9wXFxcXGZpbmFsIHdvcmtpbmdcXFxcZnlwLXYyXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxRYXNpbSBNYWppZFxcXFxEZXNrdG9wXFxcXGZpbmFsIHdvcmtpbmdcXFxcZnlwLXYyXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9RYXNpbSUyME1hamlkL0Rlc2t0b3AvZmluYWwlMjB3b3JraW5nL2Z5cC12Mi9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSBcInZpdGUtcGx1Z2luLWVsZWN0cm9uXCI7XHJcbmltcG9ydCByZW5kZXJlciBmcm9tIFwidml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksIFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgIXByb2Nlc3MuZW52LlZJVEVfV0VCX09OTFkgJiYgZWxlY3Ryb24oW1xyXG4gICAgICB7XHJcbiAgICAgICAgZW50cnk6IFwic3JjL21haW4vbWFpbi50c1wiLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW50cnk6IFwic3JjL3ByZWxvYWQvcHJlbG9hZC50c1wiLFxyXG4gICAgICAgIG9uc3RhcnQob3B0aW9ucykge1xyXG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHZpdGU6IHtcclxuICAgICAgICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgICAgIGxpYjoge1xyXG4gICAgICAgICAgICAgIGVudHJ5OiBcInNyYy9wcmVsb2FkL3ByZWxvYWQudHNcIixcclxuICAgICAgICAgICAgICBmb3JtYXRzOiBbXCJjanNcIl0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiBcInByZWxvYWQuanNcIixcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgXSksXHJcbiAgICAhcHJvY2Vzcy5lbnYuVklURV9XRUJfT05MWSAmJiByZW5kZXJlcigpLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL3JlbmRlcmVyXCIpLFxyXG4gICAgfSxcclxuICAgIGRlZHVwZTogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC9qc3gtcnVudGltZVwiLCBcInJlYWN0L2pzeC1kZXYtcnVudGltZVwiLCBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLCBcIkB0YW5zdGFjay9xdWVyeS1jb3JlXCJdLFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrWCxTQUFTLG9CQUFvQjtBQUMvWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLE9BQU8sY0FBYztBQUNyQixPQUFPLGNBQWM7QUFMckIsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQWlCLGdCQUFnQjtBQUFBLElBQzFDLENBQUMsUUFBUSxJQUFJLGlCQUFpQixTQUFTO0FBQUEsTUFDckM7QUFBQSxRQUNFLE9BQU87QUFBQSxNQUNUO0FBQUEsTUFDQTtBQUFBLFFBQ0UsT0FBTztBQUFBLFFBQ1AsUUFBUSxTQUFTO0FBQ2Ysa0JBQVEsT0FBTztBQUFBLFFBQ2pCO0FBQUEsUUFDQSxNQUFNO0FBQUEsVUFDSixPQUFPO0FBQUEsWUFDTCxLQUFLO0FBQUEsY0FDSCxPQUFPO0FBQUEsY0FDUCxTQUFTLENBQUMsS0FBSztBQUFBLFlBQ2pCO0FBQUEsWUFDQSxlQUFlO0FBQUEsY0FDYixRQUFRO0FBQUEsZ0JBQ04sZ0JBQWdCO0FBQUEsY0FDbEI7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsU0FBUztBQUFBLEVBQ3pDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsSUFDL0M7QUFBQSxJQUNBLFFBQVEsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLHlCQUF5Qix5QkFBeUIsc0JBQXNCO0FBQUEsRUFDOUg7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
