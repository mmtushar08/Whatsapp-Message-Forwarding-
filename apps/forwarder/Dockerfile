# Multi-stage build for production.
# Build context must be the repo root (see docker-compose.yml):
#   docker build -f apps/forwarder/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first so npm can resolve @whatsapp-forwarder/shared
COPY package*.json ./
COPY apps/forwarder/package*.json ./apps/forwarder/
COPY packages/shared/package.json ./packages/shared/

# Sources must be present before install: packages/shared builds itself
# via its `prepare` script during npm install
COPY packages/shared/ ./packages/shared/
RUN npm install --workspace=apps/forwarder --workspace=packages/shared

COPY apps/forwarder/ ./apps/forwarder/
RUN npm run build --workspace=apps/forwarder

# Drop devDependencies, keeping the workspace symlinks intact
RUN npm prune --omit=dev --workspace=apps/forwarder --workspace=packages/shared

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Preserve the monorepo layout so the @whatsapp-forwarder/shared workspace
# symlink in node_modules still resolves
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/forwarder/package.json ./apps/forwarder/package.json
COPY --from=builder /app/apps/forwarder/dist ./apps/forwarder/dist

# Keep CWD at /app: DB_PATH (data/forwarder.db) and winston logs (logs/)
# resolve relative to it, matching the volume mounts in docker-compose.yml
RUN mkdir -p /app/data /app/logs
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "apps/forwarder/dist/index.js"]
