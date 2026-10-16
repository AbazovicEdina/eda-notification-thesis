FROM node:22.11-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY simulate.js .
CMD ["node", "simulate.js"]
