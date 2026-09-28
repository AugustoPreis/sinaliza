# The upstream prebuilt image is no longer publicly available.
# Build the same release from the official MinIO source, pinned to its immutable release tag object.
FROM golang:1.24-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src
RUN git init . \
    && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth 1 origin 01ce918d8279a20e4706b96a64396146894adee4 \
    && git checkout --detach FETCH_HEAD \
    && CGO_ENABLED=0 MINIO_RELEASE=RELEASE go build -trimpath \
      -ldflags "$(MINIO_RELEASE=RELEASE go run buildscripts/gen-ldflags.go)" \
      -o /out/minio .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates curl
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /usr/share/licenses/minio/LICENSE
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="07c3a429bfed433e49018cb0f78a52145d4bedeb"
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
