# k6 mit SSE-Extension (xk6-sse) — k6 kann SSE nicht nativ.
# Build läuft komplett im Container (Multi-Stage): kein lokales Go nötig,
# identisch auf Windows/macOS/Linux. Siehe DECISIONS.md, Abschnitte 2 und 3.
FROM grafana/xk6:latest AS builder
WORKDIR /build
RUN xk6 build --with github.com/phymbert/xk6-sse@latest --output /build/k6

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /build/k6 /usr/local/bin/k6
WORKDIR /k6
ENTRYPOINT ["k6"]
