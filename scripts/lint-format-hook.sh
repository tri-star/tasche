#!/usr/bin/env bash
# Lint/Format hook for Claude Code and Codex.
#
# Usage:
#   check  mode (PostToolUse): echo '<json>' | bash scripts/lint-format-hook.sh check
#   record mode (PostToolUse): echo '<json>' | bash scripts/lint-format-hook.sh record
#   flush  mode (Stop):        echo '<json>' | bash scripts/lint-format-hook.sh flush
#   manual flush:              bash scripts/lint-format-hook.sh flush <<< '{}'
#
# "check" mode runs lint on the edited file immediately and exits non-zero on failure
# so Claude can see and fix errors during the same turn.
# It also records the file path for the Stop flush (format + full lint).
#
# Infinite loop guard: consecutive failures per file are tracked; after 3 failures
# the check is silently skipped to break the edit → fail → edit cycle.
#
# To add a new package, append a case block in the "flush" and "check" sections.

set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODE="${1:-flush}"

input_json="$(cat)"

session_id="$(printf '%s' "$input_json" | jq -r '.session_id // empty' 2>/dev/null || true)"
[[ -z "$session_id" ]] && session_id="default"

queue_file="${TMPDIR:-/tmp}/tasche-lint-hook-${session_id}.queue"

_get_file_path() {
  printf '%s' "$input_json" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null || true
}

_detect_package() {
  local file_path="$1"
  if [[ "$file_path" == *"/packages/frontend/"* ]]; then
    echo "frontend"
  elif [[ "$file_path" == *"/packages/backend/"* ]]; then
    echo "backend"
  else
    echo ""
  fi
}

case "$MODE" in
  check)
    file_path="$(_get_file_path)"
    [[ -z "$file_path" ]] && exit 0

    # Record for Stop flush (format + full lint)
    printf '%s\n' "$file_path" >> "$queue_file"

    pkg="$(_detect_package "$file_path")"
    [[ -z "$pkg" ]] && exit 0

    # Infinite loop guard: skip after 3 consecutive failures for the same file
    file_hash=$(printf '%s' "$file_path" | sha256sum | cut -c1-12)
    retry_file="${TMPDIR:-/tmp}/tasche-lint-retry-${session_id}-${file_hash}"
    retry_count=$(cat "$retry_file" 2>/dev/null || echo 0)

    if [[ "$retry_count" -ge 3 ]]; then
      echo "[lint-format-hook] skipped (max retries reached): $(basename "$file_path")"
      exit 0
    fi

    echo "[lint-format-hook] checking: $(basename "$file_path") ($pkg)"

    case "$pkg" in
      frontend)
        if (cd "$PROJECT_ROOT/packages/frontend" && pnpm exec biome check "$file_path"); then
          rm -f "$retry_file"
          exit 0
        else
          echo $((retry_count + 1)) > "$retry_file"
          exit 1
        fi
        ;;
      backend)
        rel="$(realpath --relative-to="$PROJECT_ROOT/packages/backend" "$file_path" 2>/dev/null || basename "$file_path")"
        if (cd "$PROJECT_ROOT" && docker compose exec -T api uv run ruff check "$rel"); then
          rm -f "$retry_file"
          exit 0
        else
          echo $((retry_count + 1)) > "$retry_file"
          exit 1
        fi
        ;;
    esac
    ;;

  record)
    file_path="$(_get_file_path)"
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
    echo "[lint-format-hook] unknown mode: $MODE (use 'check', 'record', or 'flush')" >&2
    exit 1
    ;;
esac
