# Railway: Caddy serves the artist site and proxies the local Node merch backend.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Feeds (YouTube/Apple) holen; bei Fehlern bleibt der versionierte Cache (Exit-Code immer 0)
RUN node scripts/update-feeds.ts || true
RUN npm run build

FROM caddy:2-alpine AS caddy

FROM node:24-alpine
WORKDIR /app
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY shop/admin.mjs shop/config.mjs shop/http.mjs shop/mail.mjs shop/orders.mjs shop/serve.mjs shop/sumup.mjs shop/products.json ./shop/
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
CMD ["node", "shop/serve.mjs"]
