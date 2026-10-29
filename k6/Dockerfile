# k6 with the SSE extension (xk6-sse), because k6 cannot do SSE natively.
# The build runs entirely in the container (multi-stage), so no local Go is
# needed and it is identical on Windows, macOS and Linux. See DECISIONS.md,
# sections 2 and 3.
#
# IMPORTANT: k6 must stay pinned to v1.x. Without a version, xk6 builds
# k6 v2 (module path go.k6.io/k6/v2). xk6-sse depends on the v1 module path
# and is then compiled but never active ("conflicting k6 versions" warning,
# k6/x/sse is unknown at runtime). v1.2.1 is the version from the go.mod of
# xk6-sse v0.1.12.
# The builder is pinned as well (1.4.7 = version of the feasibility check).
# An unpinned builder can silently change the build behavior, which is
# exactly the class of error that caused the v2 conflict above.
FROM grafana/xk6:1.4.7@sha256:16a4044c63bbef291bd51c9213fdcfaee7342d0fac2c9bb9ec64eca23ac35377 AS builder
WORKDIR /build
RUN xk6 build v1.2.1 --with github.com/phymbert/xk6-sse@v0.1.12 --output /build/k6

FROM alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc
RUN apk add --no-cache ca-certificates
COPY --from=builder /build/k6 /usr/local/bin/k6
WORKDIR /k6
ENTRYPOINT ["k6"]
