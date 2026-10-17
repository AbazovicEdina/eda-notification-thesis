FROM node:22.11-alpine@sha256:b64ced2e7cd0a4816699fe308ce6e8a08ccba463c757c00c14cd372e3d2c763e
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY sse.js ws.js ./
EXPOSE 8080
CMD ["node", "sse.js"]
