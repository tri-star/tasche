#!/usr/bin/env bash
set -euo pipefail

# プロジェクトルートを検出
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/packages/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "ERROR: packages/frontend ディレクトリが見つかりません: $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"

echo "=== Format (pnpm format) ==="
pnpm format 2>&1 || true

echo ""
echo "=== Lint (pnpm lint) ==="
pnpm lint 2>&1
LINT_EXIT=$?

if [ $LINT_EXIT -eq 0 ]; then
  echo ""
  echo "OK: lint/format が正常に完了しました。"
else
  echo ""
  echo "NG: lint でエラーが検出されました。上記の出力を確認してください。"
  exit $LINT_EXIT
fi
