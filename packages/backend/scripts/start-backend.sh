#!/usr/bin/env sh
set -eu

UVICORN_ARGS="tasche.main:app --host 0.0.0.0 --port 8080 --no-access-log"

if [ "${ENABLE_TELEMETRY:-false}" = "true" ]; then
  if [ -x /opt/otel-instrument ]; then
    exec /opt/otel-instrument uvicorn ${UVICORN_ARGS}
  fi

  exec opentelemetry-instrument uvicorn ${UVICORN_ARGS}
fi

exec uvicorn ${UVICORN_ARGS}
