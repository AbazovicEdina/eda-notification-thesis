FROM node:26.11.1-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a
WORKDIR /app
COPY package.json sampler.js ./
# Wartet nur; die eigentliche Arbeit startet tools/orchestrate per
# `docker compose exec` (sampler.js info | measure).
CMD ["tail", "-f", "/dev/null"]
