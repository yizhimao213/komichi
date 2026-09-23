import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SPA_EXACT = new Set([
  "/posts",
  "/notes",
  "/notes/series",
  "/friends",
  "/projects",
  "/says",
  "/about",
  "/about-site",
  "/message",
  "/timeline",
  "/thinking",
  "/categories",
  "/komichi",
]);

function shouldSpa(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    SPA_EXACT.has(path) ||
    path.startsWith("/posts/") ||
    path.startsWith("/notes/") ||
    path.startsWith("/categories/")
  );
}

function rewriteToSpa(req) {
  const raw = req.url || "/";
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? "" : raw.slice(q);
  if (!shouldSpa(pathname)) return;
  req.url = `/index.html${search}`;
}

function spaHtmlGuard() {
  return {
    name: "spa-html-guard",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" || req.method === "HEAD") rewriteToSpa(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" || req.method === "HEAD") rewriteToSpa(req);
        next();
      });
    },
  };
}

const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:8787",
    changeOrigin: true,
  },
  "/files": {
    target: "http://127.0.0.1:8787",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [spaHtmlGuard(), react()],
  appType: "spa",
  resolve: {
    dedupe: [
      "lexical",
      "@lexical/react",
      "@lexical/list",
      "@lexical/rich-text",
      "@lexical/selection",
      "@lexical/utils",
    ],
  },
  optimizeDeps: {
    include: [
      "lexical",
      "@lexical/list",
      "@lexical/rich-text",
      "@lexical/selection",
      "@lexical/utils",
      "@lexical/markdown",
      "@lexical/headless",
      "@haklex/rich-editor",
      "@haklex/rich-editor/commands",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".monkeycode-ai.online", ".ixoxi.cn"],
    proxy: apiProxy,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".monkeycode-ai.online", ".ixoxi.cn"],
    proxy: apiProxy,
  },
});
