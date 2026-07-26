# k6 mit SSE-Extension (xk6-sse) — k6 kann SSE nicht nativ.
# Build läuft komplett im Container (Multi-Stage): kein lokales Go nötig,
# identisch auf Windows/macOS/Linux. Siehe DECISIONS.md, Abschnitte 2 und 3.
#
# WICHTIG: k6 muss auf v1.x gepinnt bleiben. xk6 baut ohne Versionsangabe
# k6 v2 (Modulpfad go.k6.io/k6/v2); xk6-sse hängt am v1-Modulpfad und wird
# dann zwar kompiliert, aber nie aktiv ("conflicting k6 versions"-Warnung,
# k6/x/sse ist zur Laufzeit unbekannt). v1.2.1 = die Version aus dem go.mod
# von xk6-sse v0.1.12.
# Builder ebenfalls gepinnt (1.4.7 = Version des Machbarkeitsnachweises):
# ein ungepinnter Builder kann das Build-Verhalten still ändern — genau die
# Fehlerklasse, die den v2-Konflikt oben verursacht hat.
FROM grafana/xk6:1.4.7 AS builder
WORKDIR /build
RUN xk6 build v1.2.1 --with github.com/phymbert/xk6-sse@v0.1.12 --output /build/k6

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /build/k6 /usr/local/bin/k6
WORKDIR /k6
ENTRYPOINT ["k6"]
