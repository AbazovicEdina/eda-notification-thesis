FROM node:22.11-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: bullmq deklariert einen optionalen Peer auf redis>=5,
# den wir nicht nutzen (wir nutzen bullmq nur über ioredis-intern und die
# Pub/Sub-Seite über das separate redis@4-Paket) — siehe package-lock.json.
RUN npm ci --omit=dev --legacy-peer-deps
COPY sse.js ws.js ./
COPY queue ./queue
EXPOSE 8080
CMD ["node", "sse.js"]
