#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODE="${1:-}"
SESSION_ID="${2:-default}"
shift $(( $# >= 2 ? 2 : $# ))

BACKEND_COMPOSE_FILE="$PROJECT_ROOT/packages/backend/compose.yaml"
STATE_DIR="${LINT_FORMAT_HOOK_TMPDIR:-${TMPDIR:-/tmp}}"
QUEUE_FILE="${STATE_DIR}/tasche-lint-hook-${SESSION_ID}.queue"
MAX_RETRIES=3

mkdir -p "$STATE_DIR"

log() {
  printf '[lint-format-hook] %s\n' "$*"
}

normalize_path() {
  local raw_path="$1"
  if [[ "$raw_path" = /* ]]; then
    printf '%s\n' "$raw_path"
  else
    printf '%s/%s\n' "$PROJECT_ROOT" "$raw_path"
  fi
}

detect_package() {
  local file_path="$1"
  case "$file_path" in
    */packages/frontend/*) printf 'frontend\n' ;;
    */packages/backend/*) printf 'backend\n' ;;
    *) printf '\n' ;;
  esac
}

queue_paths() {
  local raw_path
  for raw_path in "$@"; do
    [[ -z "$raw_path" ]] && continue
    normalize_path "$raw_path" >> "$QUEUE_FILE"
  done
}

retry_file_for() {
  local file_path="$1"
  local file_hash
  file_hash="$(printf '%s' "$file_path" | sha256sum | cut -c1-12)"
  printf '%s/tasche-lint-retry-%s-%s\n' "$STATE_DIR" "$SESSION_ID" "$file_hash"
}

relative_to() {
  local base="$1"
  local target="$2"
  case "$target" in
    "$base"/*)
      printf '%s\n' "${target#"$base"/}"
      ;;
    *)
      realpath --relative-to="$base" "$target" 2>/dev/null || basename "$target"
      ;;
  esac
}

run_frontend_check() {
  local file_path="$1"
  local rel_path
  rel_path="$(relative_to "$PROJECT_ROOT/packages/frontend" "$file_path")"
  (
    cd "$PROJECT_ROOT/packages/frontend"
    pnpm exec biome check "$rel_path"
  )
}

run_frontend_format_check() {
  local file_path="$1"
  local rel_path
  rel_path="$(relative_to "$PROJECT_ROOT/packages/frontend" "$file_path")"
  (
    cd "$PROJECT_ROOT/packages/frontend"
    pnpm exec biome check --write "$rel_path"
  )
}

run_backend_check() {
  local file_path="$1"
  local rel_path
  rel_path="$(relative_to "$PROJECT_ROOT/packages/backend" "$file_path")"
  (
    cd "$PROJECT_ROOT"
    docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff check "$rel_path"
  )
}

run_backend_format_check() {
  local file_path="$1"
  local rel_path
  rel_path="$(relative_to "$PROJECT_ROOT/packages/backend" "$file_path")"
  (
    cd "$PROJECT_ROOT"
    docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff format "$rel_path"
    docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff check "$rel_path" --fix
    docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff check "$rel_path"
  )
}

run_check() {
  local raw_path normalized_path pkg retry_file retry_count overall_status=0

  queue_paths "$@"

  for raw_path in "$@"; do
    [[ -z "$raw_path" ]] && continue
    normalized_path="$(normalize_path "$raw_path")"
    pkg="$(detect_package "$normalized_path")"
    [[ -z "$pkg" ]] && continue

    retry_file="$(retry_file_for "$normalized_path")"
    retry_count="$(cat "$retry_file" 2>/dev/null || echo 0)"

    if [[ "$retry_count" -ge "$MAX_RETRIES" ]]; then
      log "skipped (max retries reached): $(basename "$normalized_path")"
      continue
    fi

    log "checking: $(basename "$normalized_path") ($pkg)"
    if [[ "$pkg" == "frontend" ]]; then
      if run_frontend_check "$normalized_path"; then
        rm -f "$retry_file"
      else
        printf '%s\n' $((retry_count + 1)) > "$retry_file"
        overall_status=1
      fi
    else
      if run_backend_check "$normalized_path"; then
        rm -f "$retry_file"
      else
        printf '%s\n' $((retry_count + 1)) > "$retry_file"
        overall_status=1
      fi
    fi
  done

  return "$overall_status"
}

run_format_check() {
  local raw_path normalized_path pkg retry_file retry_count overall_status=0

  queue_paths "$@"

  for raw_path in "$@"; do
    [[ -z "$raw_path" ]] && continue
    normalized_path="$(normalize_path "$raw_path")"
    pkg="$(detect_package "$normalized_path")"
    [[ -z "$pkg" ]] && continue

    if [[ ! -f "$normalized_path" ]]; then
      log "queued only (file missing): $(basename "$normalized_path")"
      continue
    fi

    retry_file="$(retry_file_for "$normalized_path")"
    retry_count="$(cat "$retry_file" 2>/dev/null || echo 0)"

    if [[ "$retry_count" -ge "$MAX_RETRIES" ]]; then
      log "skipped (max retries reached): $(basename "$normalized_path")"
      continue
    fi

    if [[ "$pkg" == "frontend" ]]; then
      log "format/checking: $(basename "$normalized_path") ($pkg)"
      if run_frontend_format_check "$normalized_path"; then
        rm -f "$retry_file"
      else
        printf '%s\n' $((retry_count + 1)) > "$retry_file"
        overall_status=1
      fi
    elif [[ "$normalized_path" == *.py ]]; then
      log "format/checking: $(basename "$normalized_path") ($pkg)"
      if run_backend_format_check "$normalized_path"; then
        rm -f "$retry_file"
      else
        printf '%s\n' $((retry_count + 1)) > "$retry_file"
        overall_status=1
      fi
    else
      log "queued only (unsupported immediate format): $(basename "$normalized_path")"
    fi
  done

  return "$overall_status"
}

packages_from_inputs() {
  local item normalized_path pkg

  for item in "$@"; do
    [[ -z "$item" ]] && continue
    case "$item" in
      frontend|backend)
        printf '%s\n' "$item"
        ;;
      *)
        normalized_path="$(normalize_path "$item")"
        pkg="$(detect_package "$normalized_path")"
        [[ -n "$pkg" ]] && printf '%s\n' "$pkg"
        ;;
    esac
  done
}

run_flush() {
  local -a package_inputs=()
  local -a packages=()
  local pkg overall_status=0

  if [[ "$#" -gt 0 ]]; then
    mapfile -t package_inputs < <(packages_from_inputs "$@" | awk '!seen[$0]++')
  elif [[ -f "$QUEUE_FILE" ]]; then
    mapfile -t package_inputs < <(
      while IFS= read -r queued_path; do
        packages_from_inputs "$queued_path"
      done < "$QUEUE_FILE" | awk '!seen[$0]++'
    )
  fi

  rm -f "$QUEUE_FILE"

  packages=("${package_inputs[@]}")
  [[ "${#packages[@]}" -eq 0 ]] && return 0

  log "packages to process: ${packages[*]}"

  for pkg in "${packages[@]}"; do
    log "running format/lint for: $pkg"
    case "$pkg" in
      frontend)
        if ! (
          cd "$PROJECT_ROOT"
          pnpm --filter @tasche/frontend format
          pnpm --filter @tasche/frontend lint
        ); then
          overall_status=1
        fi
        ;;
      backend)
        if ! (
          cd "$PROJECT_ROOT"
          docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff format .
          docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff check . --fix
          docker compose -f "$BACKEND_COMPOSE_FILE" exec -T api uv run ruff check .
        ); then
          overall_status=1
        fi
        ;;
      *)
        log "unknown package: $pkg (skip)"
        ;;
    esac
  done

  return "$overall_status"
}

case "$MODE" in
  check)
    run_check "$@"
    ;;
  record)
    queue_paths "$@"
    ;;
  format-check)
    run_format_check "$@"
    ;;
  flush)
    run_flush "$@"
    ;;
  *)
    printf '[lint-format-hook] unknown mode: %s (use check, record, format-check, or flush)\n' "$MODE" >&2
    exit 1
    ;;
esac
