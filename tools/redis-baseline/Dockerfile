FROM node:22.11-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY baseline.js .
CMD ["node", "baseline.js"]
