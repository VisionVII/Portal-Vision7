import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      // Main n8n proxy - maps /n8n to Render root (n8n without N8N_PATH)
      "/n8n": {
        target: "https://n8n-vision7.onrender.com",
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/n8n/, ""),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy Error] n8n proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
    },
  },
  plugins: [
    react(),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/use-sync-external-store/")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("react-router-dom") ||
            id.includes("react-router") ||
            id.includes("@remix-run/router") ||
            id.includes("/node_modules/history/")
          ) {
            return "vendor-router";
          }

          if (
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/query-core")
          ) {
            return "vendor-query";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          if (
            id.includes("@tiptap") ||
            id.includes("prosemirror") ||
            id.includes("dompurify")
          ) {
            return "vendor-editor";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner") ||
            id.includes("input-otp")
          ) {
            return "vendor-ui";
          }

          if (id.includes("recharts") || id.includes("embla-carousel")) {
            return "vendor-data-viz";
          }

          if (id.includes("date-fns")) {
            return "vendor-date";
          }

          return "vendor-misc";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
