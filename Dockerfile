# Multi-stage build for the SENTINEL frontend (TanStack Start SSR).
#
# Stage 1 builds the app; stage 2 ships only the build output, the server
# adapter, and production node_modules. The dev server and its toolchain are
# not in the final image.

# ── Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first so layer caching survives source edits.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the sources the build needs (see .dockerignore for exclusions).
COPY . .

RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Production deps only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build output plus the Node HTTP adapter that serves it.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs

# Run unprivileged. The node image already has a `node` user.
USER node

EXPOSE 3000

# The adapter exposes /healthz for orchestrators.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
