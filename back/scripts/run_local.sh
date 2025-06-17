#!/usr/bin/env bash
set -euo pipefail

docker build --build-arg WATCHFILES_FORCE_POLLING=true -t "gaia" .

# Verify that the volume mount works
docker run \
  --rm \
  -v ~/.aws:/tmp/aws \
  docker.olorin.com/docker-rmt/busybox \
  echo "verified podman volume mount" \
  || (echo "ERROR: failed to verify volume mount is working for Podman... maybe restart VM?" && exit 1)

# 8443 is the TLS port
# 8490 is the metrics port
# 8090 is the Service Mesh port
# 8000 is the FastAPI application port
docker run \
  --name "gaia" \
  --rm \
  -e APP_ENV=local \
  -e APP_NAME="gaia" \
  -p 8443:8443 \
  -p 8490:8490 \
  -p 8090:8090 \
  -p 8000:8000 \
  -v ~/.aws:/home/appuser/.aws \
  -v ~/.deviceauth:/home/appuser/.deviceauth \
  -v ./app:/app/app \
  "gaia"
