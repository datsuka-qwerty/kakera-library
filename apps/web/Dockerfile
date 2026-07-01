# Builder: Node 22 LTS on Alpine — aligned with CI (node-version: "22")
FROM node:22-alpine AS builder
WORKDIR /monorepo
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
RUN npm ci --ignore-scripts
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build:shared && npm run build:web

# Final: nginx stable-alpine — always receives latest stable + Alpine security patches
FROM nginx:stable-alpine
COPY --from=builder /monorepo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# Drop root: remove 'user nginx;' (unneeded when USER is set below),
# redirect pid to /tmp (writable by non-root), fix directory ownership
RUN sed -i '/^user /d' /etc/nginx/nginx.conf \
 && sed -i 's|/var/run/nginx\.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx \
      /usr/share/nginx/html \
      /var/cache/nginx \
      /var/log/nginx \
      /etc/nginx/conf.d
USER nginx
EXPOSE 8080
