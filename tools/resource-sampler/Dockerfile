FROM node:22.11-alpine
WORKDIR /app
COPY package.json sampler.js ./
# Wartet nur; die eigentliche Arbeit startet tools/orchestrate per
# `docker compose exec` (sampler.js info | measure).
CMD ["tail", "-f", "/dev/null"]
