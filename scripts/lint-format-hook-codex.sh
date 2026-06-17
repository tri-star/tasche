#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-flush}"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CORE_SCRIPT="$PROJECT_ROOT/scripts/lint-format-hook-core.sh"
INPUT_JSON="$(cat)"

session_id="$(printf '%s' "$INPUT_JSON" | jq -r '.session_id // "default"' 2>/dev/null || printf 'default')"

mapfile -t direct_paths < <(
  printf '%s' "$INPUT_JSON" | jq -r '
    [
      .tool_input.file_path // empty,
      .tool_input.notebook_path // empty,
      .tool_input.path // empty
    ] | .[] | select(length > 0)
  ' 2>/dev/null
)

mapfile -t patch_paths < <(
  printf '%s' "$INPUT_JSON" | jq -r '.tool_input.command // empty' 2>/dev/null \
    | awk '
        /^\*\*\* (Add|Update|Delete) File: / {
          sub(/^\*\*\* (Add|Update|Delete) File: /, "")
          print
        }
        /^\*\*\* Move to: / {
          sub(/^\*\*\* Move to: /, "")
          print
        }
      '
)

if [[ "${#direct_paths[@]}" -gt 0 || "${#patch_paths[@]}" -gt 0 ]]; then
  mapfile -t all_paths < <(printf '%s\n' "${direct_paths[@]}" "${patch_paths[@]}" | awk 'NF && !seen[$0]++')
else
  all_paths=()
fi

exec "$CORE_SCRIPT" "$MODE" "$session_id" "${all_paths[@]}"
