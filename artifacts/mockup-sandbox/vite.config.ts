import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

// Development-only design sandbox: it has no production deploy target. PORT and
// BASE_PATH were injected by Replit; everywhere else they are defaults so that
// `vite build` (and the root `pnpm run build`) does not fail on a missing env.
const DEFAULT_DEV_PORT = 5174;

function resolvePort(): number {
  const raw = process.env.PORT;
  if (!raw) return DEFAULT_DEV_PORT;

  const port = Number(raw);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }

  return port;
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig(async ({ command }): Promise<UserConfig> => {
  const isDev = command === "serve";
  const isReplit = process.env.REPL_ID !== undefined;
  const port = resolvePort();

  return {
    base: basePath,
    plugins: [
      mockupPreviewPlugin(),
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
      // Replit-only: needs the platform's editor to be useful at all.
      ...(isDev && isReplit
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
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
