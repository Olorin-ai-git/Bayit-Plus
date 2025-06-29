#!/bin/bash

#When sidecar is injected, wait for sidecar to come up
if [[ "$MESH_ENABLED" == "true" ]]; then
until (echo >/dev/tcp/localhost/$MESH_SIDECAR_PORT) &>/dev/null ; do echo Waiting for Sidecar; sleep 3 ; done ; echo Sidecar available;
fi

# When APP_ENV is set to local, enable reload flag
if [[ "$APP_ENV" == "local" ]]; then
  RELOAD_FLAG="--reload"
fi

mkdir -p ./tls
output=$(openssl req -new -newkey rsa:4096 -days 3650 -nodes -x509 -subj "/C=US/ST=CA/L=Mountain View/O=Olorin/CN=app" -keyout ./tls/key.pem -out ./tls/cert.pem 2>&1) || echo "$output"

mkdir -p nginx
/usr/sbin/nginx -c nginx.conf -p "$PWD/nginx"

CMD=".venv/bin/uvicorn"
CMD_ARGS=("app.service.server:app")
if [[ "${OPENTEL_ENABLED,,}" == "true" || "${TELEMETRY_ENABLED,,}" == "true" ]]; then
  echo Enabling telemetry
  CMD_ARGS=("${CMD}" "${CMD_ARGS[@]}")
  CMD=".venv/bin/opentelemetry-instrument"
fi

echo Using command "${CMD}" with args "${CMD_ARGS[@]}"

# see https://fastapi.tiangolo.com/deployment/docker/#one-process-per-container for recommended deployment configuration
# see https://www.uvicorn.org/deployment/#running-behind-nginx

# 8090 is the Mesh port
# see https://github.olorin.com/pages/services-mesh/mesh-docs/getting-started/#step-3-inspectverifyupdate-necessary-changes-to-your-service-in-the-pr-and-merge-it

# higher timeout-keep-alive is a workaround for
# upstream_reset_before_response_started{connection_termination} errors from Service Mesh
# see https://medium.com/@in.live.in/puzzling-503s-and-istio-1bf504b9aae6
exec "${CMD}" "${CMD_ARGS[@]}" \
 --loop uvloop \
 --host 0.0.0.0 \
 --port 8000 \
 --proxy-headers \
 --access-log \
 --no-server-header \
 --timeout-keep-alive 60 \
 --workers 1 \
 $RELOAD_FLAG 
