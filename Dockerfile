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
COPY --from=build /app/node_modules/jose ./node_modules/jose
COPY shop/access.mjs shop/admin.mjs shop/campaign.mjs shop/config.mjs shop/http.mjs shop/mail.mjs shop/orders.mjs shop/serve.mjs shop/sumup.mjs shop/products.json ./shop/
COPY shop/preorder.json ./shop/
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
CMD ["node", "shop/serve.mjs"]
