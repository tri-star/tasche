#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CORE="$PROJECT_ROOT/scripts/lint-format-hook-core.sh"
CLAUDE="$PROJECT_ROOT/scripts/lint-format-hook-claude.sh"
CODEX="$PROJECT_ROOT/scripts/lint-format-hook-codex.sh"
BACKEND_COMPOSE="$PROJECT_ROOT/packages/backend/compose.yaml"

TEST_TMP="$(mktemp -d)"
trap 'rm -rf "$TEST_TMP"' EXIT

mkdir -p "$TEST_TMP/bin" "$TEST_TMP/logs"

cat > "$TEST_TMP/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'pnpm %s\n' "$*" >> "${HOOK_LOG_DIR}/commands.log"

if [[ "$*" == *"biome check"* ]]; then
  if [[ "${PNPM_BIOME_FAIL_ON:-}" != "" && "$*" == *"${PNPM_BIOME_FAIL_ON}"* ]]; then
    exit 1
  fi
  exit 0
fi

if [[ "$*" == *"--filter @tasche/frontend format"* ]]; then
  [[ "${PNPM_FRONTEND_FORMAT_FAIL:-0}" == "1" ]] && exit 1
  exit 0
fi

if [[ "$*" == *"--filter @tasche/frontend lint"* ]]; then
  [[ "${PNPM_FRONTEND_LINT_FAIL:-0}" == "1" ]] && exit 1
  exit 0
fi

exit 0
EOF

cat > "$TEST_TMP/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'docker %s\n' "$*" >> "${HOOK_LOG_DIR}/commands.log"

if [[ "$*" == *"ruff check"* && "$*" != *". --fix"* && "$*" != *"check ."* ]]; then
  if [[ "${DOCKER_RUFF_FAIL_ON:-}" != "" && "$*" == *"${DOCKER_RUFF_FAIL_ON}"* ]]; then
    exit 1
  fi
  exit 0
fi

if [[ "$*" == *"ruff format ."* ]]; then
  [[ "${DOCKER_BACKEND_FORMAT_FAIL:-0}" == "1" ]] && exit 1
  exit 0
fi

if [[ "$*" == *"ruff check . --fix"* ]]; then
  [[ "${DOCKER_BACKEND_FIX_FAIL:-0}" == "1" ]] && exit 1
  exit 0
fi

if [[ "$*" == *"ruff check ."* ]]; then
  [[ "${DOCKER_BACKEND_CHECK_FAIL:-0}" == "1" ]] && exit 1
  exit 0
fi

exit 0
EOF

chmod +x "$TEST_TMP/bin/pnpm" "$TEST_TMP/bin/docker"

export PATH="$TEST_TMP/bin:$PATH"
export LINT_FORMAT_HOOK_TMPDIR="$TEST_TMP/state"
export HOOK_LOG_DIR="$TEST_TMP/logs"
mkdir -p "$LINT_FORMAT_HOOK_TMPDIR"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  [[ "$expected" == "$actual" ]] || fail "$message (expected=$expected actual=$actual)"
}

assert_contains() {
  local needle="$1"
  local file="$2"
  grep -F "$needle" "$file" >/dev/null || fail "missing '$needle' in $file"
}

queue_file() {
  printf '%s/tasche-lint-hook-%s.queue\n' "$LINT_FORMAT_HOOK_TMPDIR" "$1"
}

rm -f "$HOOK_LOG_DIR/commands.log"

printf '%s' '{"session_id":"claude-test","tool_input":{"file_path":"packages/frontend/src/app.tsx"}}' | "$CLAUDE" record
assert_contains "$PROJECT_ROOT/packages/frontend/src/app.tsx" "$(queue_file claude-test)"

rm -f "$HOOK_LOG_DIR/commands.log"
apply_patch_payload=$(cat <<'EOF'
{"session_id":"codex-patch","tool_input":{"command":"*** Begin Patch\n*** Update File: packages/frontend/src/a.ts\n@@\n*** Update File: packages/backend/app/b.py\n@@\n*** Move to: packages/backend/app/c.py\n*** End Patch\n"}}
EOF
)
printf '%s' "$apply_patch_payload" | "$CODEX" record
assert_contains "$PROJECT_ROOT/packages/frontend/src/a.ts" "$(queue_file codex-patch)"
assert_contains "$PROJECT_ROOT/packages/backend/app/b.py" "$(queue_file codex-patch)"
assert_contains "$PROJECT_ROOT/packages/backend/app/c.py" "$(queue_file codex-patch)"

printf '%s' '{"session_id":"codex-empty","tool_input":{"command":"echo hi"}}' | "$CODEX" check

rm -f "$HOOK_LOG_DIR/commands.log"
export PNPM_BIOME_FAIL_ON=""
"$CORE" check frontend-ok packages/frontend/src/ok.ts
assert_status 0 $? "frontend check should succeed"
assert_contains "pnpm exec biome check src/ok.ts" "$HOOK_LOG_DIR/commands.log"

rm -f "$HOOK_LOG_DIR/commands.log"
export PNPM_BIOME_FAIL_ON="src/fail.ts"
set +e
"$CORE" check frontend-fail packages/frontend/src/fail.ts
status=$?
set -e
assert_status 1 "$status" "frontend check should fail"

set +e
"$CORE" check frontend-fail packages/frontend/src/fail.ts >/dev/null 2>&1
"$CORE" check frontend-fail packages/frontend/src/fail.ts >/dev/null 2>&1
"$CORE" check frontend-fail packages/frontend/src/fail.ts >/dev/null 2>&1
status=$?
set -e
assert_status 0 "$status" "frontend check should skip after max retries"

rm -f "$HOOK_LOG_DIR/commands.log"
export DOCKER_RUFF_FAIL_ON=""
"$CORE" check backend-ok packages/backend/app/main.py
assert_status 0 $? "backend check should succeed"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff check app/main.py" "$HOOK_LOG_DIR/commands.log"

rm -f "$HOOK_LOG_DIR/commands.log"
export DOCKER_RUFF_FAIL_ON="app/bad.py"
set +e
"$CORE" check backend-fail packages/backend/app/bad.py
status=$?
set -e
assert_status 1 "$status" "backend check should fail"

rm -f "$HOOK_LOG_DIR/commands.log"
export PNPM_BIOME_FAIL_ON=""
export DOCKER_RUFF_FAIL_ON=""
"$CORE" format-check format-ok \
  packages/frontend/src/main.tsx \
  packages/backend/src/tasche/main.py \
  packages/backend/pyproject.toml \
  packages/frontend/src/missing.ts
assert_status 0 $? "format-check should succeed"
assert_contains "$PROJECT_ROOT/packages/frontend/src/main.tsx" "$(queue_file format-ok)"
assert_contains "$PROJECT_ROOT/packages/backend/src/tasche/main.py" "$(queue_file format-ok)"
assert_contains "$PROJECT_ROOT/packages/backend/pyproject.toml" "$(queue_file format-ok)"
assert_contains "$PROJECT_ROOT/packages/frontend/src/missing.ts" "$(queue_file format-ok)"
assert_contains "pnpm exec biome check --write src/main.tsx" "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff format src/tasche/main.py" "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff check src/tasche/main.py --fix" "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff check src/tasche/main.py" "$HOOK_LOG_DIR/commands.log"

rm -f "$HOOK_LOG_DIR/commands.log"
export PNPM_BIOME_FAIL_ON="src/main.tsx"
set +e
"$CORE" format-check format-fail packages/frontend/src/main.tsx
status=$?
set -e
assert_status 1 "$status" "format-check should fail"

set +e
"$CORE" format-check format-fail packages/frontend/src/main.tsx >/dev/null 2>&1
"$CORE" format-check format-fail packages/frontend/src/main.tsx >/dev/null 2>&1
"$CORE" format-check format-fail packages/frontend/src/main.tsx >/dev/null 2>&1
status=$?
set -e
assert_status 0 "$status" "format-check should skip after max retries"

rm -f "$HOOK_LOG_DIR/commands.log"
printf '%s\n' \
  "$PROJECT_ROOT/packages/frontend/src/a.ts" \
  "$PROJECT_ROOT/packages/frontend/src/b.ts" \
  "$PROJECT_ROOT/packages/backend/app/a.py" > "$(queue_file flush-ok)"
export PNPM_BIOME_FAIL_ON=""
export PNPM_FRONTEND_FORMAT_FAIL=0
export PNPM_FRONTEND_LINT_FAIL=0
export DOCKER_BACKEND_FORMAT_FAIL=0
export DOCKER_BACKEND_FIX_FAIL=0
export DOCKER_BACKEND_CHECK_FAIL=0
"$CORE" flush flush-ok
assert_status 0 $? "flush should succeed"
assert_contains "pnpm --filter @tasche/frontend format" "$HOOK_LOG_DIR/commands.log"
assert_contains "pnpm --filter @tasche/frontend lint" "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff format ." "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff check . --fix" "$HOOK_LOG_DIR/commands.log"
assert_contains "docker compose -f $BACKEND_COMPOSE exec -T api uv run ruff check ." "$HOOK_LOG_DIR/commands.log"

rm -f "$HOOK_LOG_DIR/commands.log"
printf '%s\n' "$PROJECT_ROOT/packages/backend/app/a.py" > "$(queue_file flush-fail)"
export DOCKER_BACKEND_CHECK_FAIL=1
set +e
"$CORE" flush flush-fail
status=$?
set -e
assert_status 1 "$status" "flush should return non-zero on failure"

printf 'ok\n'
