FROM node:20-alpine AS builder
WORKDIR /monorepo
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
RUN npm ci
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build:shared && npm run build:web

FROM nginx:1.27-alpine
COPY --from=builder /monorepo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
