#!/usr/bin/env bash
# =============================================================================
# detect-port-index.sh
# 使用可能なPROJECT_INDEXを検出するスクリプト
#
# 使い方:
#   PROJECT_INDEX=$(bash detect-port-index.sh)
#   echo "使用するPROJECT_INDEX: $PROJECT_INDEX"
#
# 出力:
#   - 成功時: 使用可能なPROJECT_INDEX番号（標準出力）
#   - 失敗時: 何も出力せず終了ステータス1で終了
#
# ポート番号の計算式:
#   API_PORT      = 10000 + PROJECT_INDEX × 100
#   DB_PORT       = 10001 + PROJECT_INDEX × 100
#   VITE_DEV_PORT = 10002 + PROJECT_INDEX × 100
# =============================================================================

set -euo pipefail

# 検索するPROJECT_INDEXの最大値（これ以上は検索しない）
MAX_INDEX=50

# ポートが使用中かどうかを確認する関数
# 引数: チェックするポート番号
# 戻り値: 0=使用中, 1=空き
is_port_in_use() {
    local port="$1"
    # lsofが利用可能な場合はlsofを使用、なければssを試みる
    if command -v lsof &>/dev/null; then
        lsof -iTCP:"$port" -sTCP:LISTEN -n -P &>/dev/null
        return $?
    elif command -v ss &>/dev/null; then
        ss -tlnp | grep -q ":$port " &>/dev/null
        return $?
    else
        # どちらも使えない場合はポートに接続を試みる
        (echo >/dev/tcp/localhost/"$port") &>/dev/null
        return $?
    fi
}

# PROJECT_INDEXを0から順番に試して、全ポートが空いているものを探す
for index in $(seq 0 $MAX_INDEX); do
    api_port=$((10000 + index * 100))
    db_port=$((10001 + index * 100))
    vite_port=$((10002 + index * 100))

    # 3つのポートが全て空いているか確認
    if ! is_port_in_use "$api_port" && \
       ! is_port_in_use "$db_port" && \
       ! is_port_in_use "$vite_port"; then
        # 使用可能なPROJECT_INDEXを出力して正常終了
        echo "$index"
        exit 0
    fi
done

# MAX_INDEXまで検索したが使用可能なインデックスが見つからなかった
echo "エラー: PROJECT_INDEX 0〜${MAX_INDEX} の範囲で使用可能なポートセットが見つかりませんでした" >&2
exit 1
