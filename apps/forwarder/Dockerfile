# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/forwarder/package*.json ./apps/forwarder/
RUN npm install --workspace=apps/forwarder
COPY apps/forwarder/ ./apps/forwarder/
COPY packages/ ./packages/
WORKDIR /app/apps/forwarder
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/apps/forwarder/dist ./dist
COPY --from=builder /app/apps/forwarder/package*.json ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
