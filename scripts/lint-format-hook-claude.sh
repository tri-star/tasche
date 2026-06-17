#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-flush}"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CORE_SCRIPT="$PROJECT_ROOT/scripts/lint-format-hook-core.sh"
INPUT_JSON="$(cat)"

session_id="$(printf '%s' "$INPUT_JSON" | jq -r '.session_id // "default"' 2>/dev/null || printf 'default')"

mapfile -t paths < <(
  printf '%s' "$INPUT_JSON" | jq -r '
    [
      .tool_input.file_path // empty,
      .tool_input.notebook_path // empty
    ] | .[] | select(length > 0)
  ' 2>/dev/null
)

exec "$CORE_SCRIPT" "$MODE" "$session_id" "${paths[@]}"
