FROM node:22.11-alpine@sha256:b64ced2e7cd0a4816699fe308ce6e8a08ccba463c757c00c14cd372e3d2c763e
WORKDIR /app
COPY package.json sampler.js ./
# Wartet nur; die eigentliche Arbeit startet tools/orchestrate per
# `docker compose exec` (sampler.js info | measure).
CMD ["tail", "-f", "/dev/null"]
