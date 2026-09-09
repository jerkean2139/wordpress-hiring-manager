# Single-image build for the Red Front Hiring Manager.
#
# The API server and the frontend ship together and are served from one origin,
# which is what Replit's app router used to do (frontend at `/`, API at `/api`).
# Keeping that shape means the generated API client's relative `/api/...` URLs
# and the session cookie work with no cross-origin configuration.

# Node 24 matches the `nodejs-24` module the project ran on under Replit.
FROM node:24-slim AS build

ENV CI=true

WORKDIR /app

# Pinned explicitly rather than via corepack, which is deprecated in recent
# Node releases. Keep this in sync with `packageManager` in package.json.
RUN npm install --global pnpm@10.33.0

# Copy only what the install step reads, so a source-only change reuses the
# cached dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/hiring-manager/package.json ./artifacts/hiring-manager/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile

COPY . .

# Typecheck the whole workspace, then build the two artifacts we deploy.
# mockup-sandbox is a development-only design sandbox and is skipped.
RUN pnpm run typecheck \
 && pnpm --filter @workspace/hiring-manager run build \
 && pnpm --filter @workspace/api-server run build


FROM node:24-slim AS runtime

ENV NODE_ENV=production
# app.listen() reads PORT; Railway overrides it with the port it assigns.
ENV PORT=8080

WORKDIR /app

# esbuild bundles the server with its dependencies, so the runtime image needs
# no node_modules at all — just the emitted bundle, its pino worker files and
# the static frontend. `lib/web.ts` finds ./public relative to the bundle.
COPY --from=build /app/artifacts/api-server/dist ./server
COPY --from=build /app/artifacts/hiring-manager/dist/public ./public

USER node

EXPOSE 8080

CMD ["node", "--enable-source-maps", "server/index.mjs"]
