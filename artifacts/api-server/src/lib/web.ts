import express, { type Express, type RequestHandler } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

/**
 * Locate the built frontend bundle.
 *
 * Replit served `artifacts/hiring-manager/dist/public` as a separate static
 * service and routed `/api` to this process. Off-platform we serve both from
 * one origin, which keeps the generated API client's relative `/api/...` URLs
 * and the session cookie working with no cross-site configuration.
 *
 * `WEB_DIST` overrides the lookup. Otherwise we try the container layout
 * (`public/` next to the server bundle) and then the repo layout, so a local
 * `pnpm run build` followed by `pnpm --filter @workspace/api-server start`
 * behaves like production.
 */
function resolveWebDist(): string | null {
  const candidates = process.env.WEB_DIST
    ? [path.resolve(process.env.WEB_DIST)]
    : [
        path.resolve(__dirname, "..", "public"),
        path.resolve(__dirname, "..", "..", "hiring-manager", "dist", "public"),
      ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Serve the single-page app: hashed assets with a long cache, everything else
 * falling back to `index.html` so client-side routes survive a hard refresh.
 *
 * Mount this after the `/api` router. It never handles `/api` paths, so an
 * unknown endpoint still returns a JSON 404 instead of the HTML shell.
 */
export function serveWebApp(app: Express): void {
  const webDist = resolveWebDist();

  if (!webDist) {
    logger.warn(
      "No frontend build found; serving the API only. Run `pnpm run build` or set WEB_DIST.",
    );
    return;
  }

  logger.info({ webDist }, "Serving frontend build");

  const assets: RequestHandler = express.static(webDist, {
    index: false,
    // Vite fingerprints filenames, so built assets are safe to cache hard.
    // index.html is excluded above and revalidated by the fallback below.
    maxAge: "1y",
    immutable: true,
  });

  app.use(assets);

  const indexHtml = path.join(webDist, "index.html");

  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    // Only HTML navigations get the shell; a missing asset should still 404.
    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(indexHtml, { lastModified: true, maxAge: 0 }, (err) => {
      if (err) next(err);
    });
  });
}
