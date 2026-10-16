FROM node:22.11-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY sse.js ws.js ./
EXPOSE 8080
CMD ["node", "sse.js"]
