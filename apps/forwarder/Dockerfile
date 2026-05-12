FROM node:18-alpine AS builder
WORKDIR /app

# Copy all workspace manifests before install for proper workspace resolution
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/forwarder/package*.json ./apps/forwarder/

RUN npm install

COPY packages/ ./packages/
COPY apps/forwarder/ ./apps/forwarder/

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/forwarder

FROM node:18-alpine AS production
WORKDIR /app

# Copy node_modules (includes symlink to shared workspace package)
COPY --from=builder /app/node_modules ./node_modules
# Copy shared package so the workspace symlink resolves
COPY --from=builder /app/packages/shared ./packages/shared
# Copy forwarder built output
COPY --from=builder /app/apps/forwarder/dist ./dist
COPY --from=builder /app/apps/forwarder/package*.json ./

RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "dist/index.js"]
