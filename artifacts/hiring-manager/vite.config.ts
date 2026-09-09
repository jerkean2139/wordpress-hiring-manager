import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Replit injected PORT and BASE_PATH into every artifact process. Other hosts
// (Railway, Netlify, plain Docker) do not, and they run `vite build` with no
// PORT at all — so these are defaults, not hard requirements. PORT only
// affects the dev/preview servers; it is irrelevant to a production build.
const DEFAULT_DEV_PORT = 5173;

function resolvePort(): number {
  const raw = process.env.PORT;
  if (!raw) return DEFAULT_DEV_PORT;

  const port = Number(raw);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }

  return port;
}

// Served from the domain root unless the host mounts the app under a subpath.
const basePath = process.env.BASE_PATH || "/";

// In production the API and this bundle share one origin, so the generated
// client's relative `/api/...` URLs just work. The dev server needs a proxy to
// reproduce that — Replit's app router used to provide it.
const apiProxyTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8080";

export default defineConfig(async ({ command }): Promise<UserConfig> => {
  const isDev = command === "serve";
  const isReplit = process.env.REPL_ID !== undefined;
  const port = resolvePort();

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      // Dev-server tooling, never bundled into a production build.
      ...(isDev
        ? [
            await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
              m.default(),
            ),
          ]
        : []),
      // Replit-only: these need the platform's editor to be useful at all.
      ...(isDev && isReplit
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
