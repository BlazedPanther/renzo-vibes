# Railway/Docker-Deployment: baut die statische Seite und liefert sie mit Caddy aus.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Feeds (YouTube/Apple) holen; bei Fehlern bleibt der versionierte Cache (Exit-Code immer 0)
RUN node scripts/update-feeds.ts || true
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
