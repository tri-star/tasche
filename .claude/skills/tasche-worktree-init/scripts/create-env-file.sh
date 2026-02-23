#!/usr/bin/env bash
# =============================================================================
# create-env-file.sh
# PROJECT_INDEXをもとに backend/frontend の .env ファイルを生成するスクリプト
#
# 使い方:
#   bash create-env-file.sh -i PROJECT_INDEX [-n PROJECT_NAME]
#
# オプション:
#   -i PROJECT_INDEX  (必須) detect-port-index.sh で取得したPROJECT_INDEX
#   -n PROJECT_NAME   (任意) Docker Composeのプロジェクト名
#                            省略時は "tasche-{PROJECT_INDEX}"
#
# 生成ファイル:
#   - packages/backend/.env
#   - packages/frontend/.env
#
# プレースホルダ形式:
#   .env.example 内の {%変数名%} を実際の値に置換します
#   例: {%API_CONTAINER_PORT%} → 10000
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# 引数のパース
# -----------------------------------------------------------------------------
PROJECT_INDEX=""
PROJECT_NAME=""

while getopts "i:n:" opt; do
    case "$opt" in
        i) PROJECT_INDEX="$OPTARG" ;;
        n) PROJECT_NAME="$OPTARG" ;;
        *) echo "使い方: $0 -i PROJECT_INDEX [-n PROJECT_NAME]" >&2; exit 1 ;;
    esac
done

# PROJECT_INDEX は必須
if [ -z "$PROJECT_INDEX" ]; then
    echo "エラー: -i オプションでPROJECT_INDEXを指定してください" >&2
    echo "使い方: $0 -i PROJECT_INDEX [-n PROJECT_NAME]" >&2
    exit 1
fi

# 数値チェック
if ! [[ "$PROJECT_INDEX" =~ ^[0-9]+$ ]]; then
    echo "エラー: PROJECT_INDEX は0以上の整数を指定してください (指定値: $PROJECT_INDEX)" >&2
    exit 1
fi

# プロジェクト名が省略された場合はデフォルト値を使用
if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="tasche-${PROJECT_INDEX}"
fi

# -----------------------------------------------------------------------------
# ポート番号の計算
# -----------------------------------------------------------------------------
API_PORT=$((10000 + PROJECT_INDEX * 100))
DB_PORT=$((10001 + PROJECT_INDEX * 100))
VITE_DEV_PORT=$((10002 + PROJECT_INDEX * 100))

echo "=== .env ファイル生成 ==="
echo "  PROJECT_INDEX     : $PROJECT_INDEX"
echo "  PROJECT_NAME      : $PROJECT_NAME"
echo "  API_CONTAINER_PORT: $API_PORT"
echo "  DB_CONTAINER_PORT : $DB_PORT"
echo "  VITE_DEV_PORT     : $VITE_DEV_PORT"
echo ""

# -----------------------------------------------------------------------------
# プレースホルダを実際の値に置換する関数
# 引数1: 入力ファイルパス (.env.example)
# 引数2: 出力ファイルパス (.env)
# -----------------------------------------------------------------------------
replace_placeholders() {
    local src="$1"
    local dst="$2"

    if [ ! -f "$src" ]; then
        echo "エラー: テンプレートファイルが見つかりません: $src" >&2
        return 1
    fi

    # sedを使って {%変数名%} を実際の値に置換
    sed \
        -e "s/{%COMPOSE_PROJECT_NAME%}/${PROJECT_NAME}/g" \
        -e "s/{%API_CONTAINER_PORT%}/${API_PORT}/g" \
        -e "s/{%DB_CONTAINER_PORT%}/${DB_PORT}/g" \
        -e "s/{%VITE_DEV_PORT%}/${VITE_DEV_PORT}/g" \
        "$src" > "$dst"

    echo "  生成完了: $dst"
}

# -----------------------------------------------------------------------------
# スクリプトの実行ディレクトリを確認
# プロジェクトルート（packages/が存在する場所）から実行されているか確認
# -----------------------------------------------------------------------------
if [ ! -d "packages/backend" ] || [ ! -d "packages/frontend" ]; then
    echo "エラー: プロジェクトルートから実行してください" >&2
    echo "  (packages/backend と packages/frontend が存在するディレクトリ)" >&2
    exit 1
fi

# -----------------------------------------------------------------------------
# backend の .env 生成
# -----------------------------------------------------------------------------
echo "--- backend/.env の生成 ---"
BACKEND_DIR="packages/backend"
BACKEND_ENV_EXAMPLE="${BACKEND_DIR}/.env.example"
BACKEND_ENV="${BACKEND_DIR}/.env"

if [ -f "$BACKEND_ENV" ]; then
    echo "  警告: ${BACKEND_ENV} が既に存在します。上書きします。"
fi

replace_placeholders "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"

# -----------------------------------------------------------------------------
# frontend の .env 生成
# -----------------------------------------------------------------------------
echo ""
echo "--- frontend/.env の生成 ---"
FRONTEND_DIR="packages/frontend"
FRONTEND_ENV_EXAMPLE="${FRONTEND_DIR}/.env.example"
FRONTEND_ENV="${FRONTEND_DIR}/.env"

if [ -f "$FRONTEND_ENV" ]; then
    echo "  警告: ${FRONTEND_ENV} が既に存在します。上書きします。"
fi

replace_placeholders "$FRONTEND_ENV_EXAMPLE" "$FRONTEND_ENV"

echo ""
echo "=== 完了 ==="
echo "  backend : ${BACKEND_ENV}"
echo "  frontend: ${FRONTEND_ENV}"
