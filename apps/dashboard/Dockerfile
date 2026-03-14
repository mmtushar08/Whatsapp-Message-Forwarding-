FROM node:18-alpine AS builder
WORKDIR /app
COPY apps/dashboard/package*.json ./
RUN npm install
COPY apps/dashboard/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
