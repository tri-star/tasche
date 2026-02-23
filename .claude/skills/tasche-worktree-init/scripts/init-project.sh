#!/usr/bin/env bash
# =============================================================================
# init-project.sh
# worktreeの開発環境を初期化するスクリプト
#
# 使い方:
#   bash init-project.sh
#
# 実行内容:
#   [backend]
#     1. Docker Composeでコンテナを起動
#     2. Alembicでデータベースマイグレーションを実行
#     3. シードデータを投入
#   [frontend]
#     4. pnpm install で依存関係をインストール
#
# 前提条件:
#   - packages/backend/.env が存在すること (create-env-file.sh で生成済み)
#   - packages/frontend/.env が存在すること (create-env-file.sh で生成済み)
#   - Docker Desktopまたはdockerdが起動していること
#   - pnpm がインストールされていること
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# スクリプトの実行ディレクトリを確認
# プロジェクトルートから実行されているか確認
# -----------------------------------------------------------------------------
if [ ! -d "packages/backend" ] || [ ! -d "packages/frontend" ]; then
    echo "エラー: プロジェクトルートから実行してください" >&2
    echo "  (packages/backend と packages/frontend が存在するディレクトリ)" >&2
    exit 1
fi

# .env ファイルの存在確認
if [ ! -f "packages/backend/.env" ]; then
    echo "エラー: packages/backend/.env が見つかりません" >&2
    echo "  先に create-env-file.sh を実行して .env を生成してください" >&2
    exit 1
fi

if [ ! -f "packages/frontend/.env" ]; then
    echo "エラー: packages/frontend/.env が見つかりません" >&2
    echo "  先に create-env-file.sh を実行して .env を生成してください" >&2
    exit 1
fi

# =============================================================================
# backend の初期化
# =============================================================================
echo "======================================"
echo "  backend の初期化を開始します"
echo "======================================"

cd packages/backend

# -----------------------------------------------------------------------------
# ステップ1: Docker Compose でコンテナを起動
# -----------------------------------------------------------------------------
echo ""
echo "--- [1/3] Docker Compose コンテナを起動 ---"
# --wait オプションでコンテナの healthcheck が HEALTHY になるまで待機する
# (Docker Compose v2.1.1 以降が必要。compose.yaml に healthcheck が定義されていること)
docker compose up -d --wait
echo "  コンテナの起動完了（healthcheck確認済み）"

# -----------------------------------------------------------------------------
# ステップ2: Alembic でデータベースマイグレーションを実行
# -----------------------------------------------------------------------------
echo ""
echo "--- [2/3] データベースマイグレーション (alembic upgrade head) ---"
docker compose exec api alembic upgrade head
echo "  マイグレーション完了"

# -----------------------------------------------------------------------------
# ステップ3: シードデータを投入
# -----------------------------------------------------------------------------
echo ""
echo "--- [3/3] シードデータ投入 (seed.py) ---"
docker compose exec api python scripts/seed.py
echo "  シードデータの投入完了"

# backend ディレクトリから戻る
cd ../..

# =============================================================================
# frontend の初期化
# =============================================================================
echo ""
echo "======================================"
echo "  frontend の初期化を開始します"
echo "======================================"

cd packages/frontend

# -----------------------------------------------------------------------------
# ステップ4: pnpm install
# -----------------------------------------------------------------------------
echo ""
echo "--- [1/1] pnpm install ---"
pnpm install
echo "  依存関係のインストール完了"

cd ../..

# =============================================================================
# 完了メッセージ
# =============================================================================
echo ""
echo "======================================"
echo "  初期化が完了しました！"
echo "======================================"
echo ""
echo "開発サーバーの起動方法:"
echo ""
echo "  [backend] docker compose up -d"
echo "  [frontend] pnpm --filter frontend dev"
echo ""

# .env から設定を読み込んでURLを表示
if [ -f "packages/backend/.env" ]; then
    API_PORT=$(grep '^API_CONTAINER_PORT=' packages/backend/.env 2>/dev/null | cut -d= -f2 || echo "未設定")
    VITE_PORT=$(grep '^VITE_DEV_PORT=' packages/frontend/.env 2>/dev/null | cut -d= -f2 || echo "未設定")
    if [ -n "$API_PORT" ]; then
        echo "  API URL      : http://localhost:${API_PORT}"
        echo "  Swagger UI   : http://localhost:${API_PORT}/docs"
    fi
    if [ -n "$VITE_PORT" ]; then
        echo "  Frontend URL : http://localhost:${VITE_PORT}"
    fi
fi
echo ""
