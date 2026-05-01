#!/usr/bin/env bash
# Lint/Format hook for Claude Code and Codex.
#
# Usage:
#   record mode (PostToolUse): echo '<json>' | bash scripts/lint-format-hook.sh record
#   flush  mode (Stop):        echo '<json>' | bash scripts/lint-format-hook.sh flush
#   manual flush:              bash scripts/lint-format-hook.sh flush <<< '{}'
#
# To add a new package, append a case block in the "flush" section below.

set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODE="${1:-flush}"

input_json="$(cat)"

session_id="$(printf '%s' "$input_json" | jq -r '.session_id // empty' 2>/dev/null || true)"
[[ -z "$session_id" ]] && session_id="default"

queue_file="${TMPDIR:-/tmp}/tasche-lint-hook-${session_id}.queue"

case "$MODE" in
  record)
    file_path="$(printf '%s' "$input_json" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null || true)"
    if [[ -n "$file_path" ]]; then
      printf '%s\n' "$file_path" >> "$queue_file"
    fi
    ;;

  flush)
    [[ ! -f "$queue_file" ]] && exit 0

    packages="$(awk -F'/' '
      {
        for (i = 1; i <= NF; i++) {
          if ($i == "packages" && i < NF) { print $(i+1); break }
        }
      }
    ' "$queue_file" | sort -u)"

    rm -f "$queue_file"

    if [[ -z "$packages" ]]; then
      exit 0
    fi

    echo "[lint-format-hook] packages to process: $(printf '%s' "$packages" | tr '\n' ' ')"

    while IFS= read -r pkg; do
      [[ -z "$pkg" ]] && continue
      echo "[lint-format-hook] running format/lint for: $pkg"
      case "$pkg" in
        frontend)
          (cd "$PROJECT_ROOT" && pnpm --filter @tasche/frontend format && pnpm --filter @tasche/frontend lint) || true
          ;;
        backend)
          (cd "$PROJECT_ROOT" && docker compose exec -T api uv run ruff format . && docker compose exec -T api uv run ruff check . --fix) || true
          ;;
        *)
          echo "[lint-format-hook] unknown package: $pkg (skip)" >&2
          ;;
      esac
    done <<< "$packages"
    ;;

  *)
    echo "[lint-format-hook] unknown mode: $MODE (use 'record' or 'flush')" >&2
    exit 1
    ;;
esac
