#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODE="${1:-flush}"
INPUT_JSON="$(cat)"

if printf '%s' "$INPUT_JSON" | jq -e '.tool_input.command? // .tool_input.path? // empty | length > 0' >/dev/null 2>&1; then
  exec "$PROJECT_ROOT/scripts/lint-format-hook-codex.sh" "$MODE" <<< "$INPUT_JSON"
fi

exec "$PROJECT_ROOT/scripts/lint-format-hook-claude.sh" "$MODE" <<< "$INPUT_JSON"
