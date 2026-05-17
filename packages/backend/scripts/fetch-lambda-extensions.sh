#!/usr/bin/env bash
# AWS Parameters and Secrets Lambda Extension の Layer zip をダウンロードし、
# Docker build の context に取り込む形で展開する。
#
# コンテナイメージ Lambda は Lambda 設定経由で Layer をアタッチできないため、
# 公式ブログの手法 #2 に従い、Layer の中身をビルド時にイメージへ焼き込む。
# https://aws.amazon.com/jp/blogs/compute/working-with-lambda-layers-and-extensions-in-container-images/
#
# 使い方:
#   bash scripts/fetch-lambda-extensions.sh
# 必要な権限:
#   lambda:GetLayerVersion (公式 Layer も同権限が必要)

set -euo pipefail

# AWS Parameters and Secrets Lambda Extension (x86_64).
# Lambda 関数の Architectures は x86_64 のため、x86_64 用 Layer を取得する。
# (arm64 用は Layer 名末尾が `-Arm64` のもの。アーキテクチャ不整合だと
#  /opt/extensions/bootstrap で `exec format error` になるので注意.)
# バージョンは適宜更新する (公式 Layer の最新版に追従).
# 参考: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html
LAYER_ARN="${LAYER_ARN:-arn:aws:lambda:ap-southeast-1:044395824272:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11}"
REGION="${REGION:-ap-southeast-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST_DIR="${BACKEND_DIR}/build/lambda-extensions"

echo "[fetch-lambda-extensions] Resolving layer download URL..."
LOCATION=$(aws lambda get-layer-version-by-arn \
  --arn "${LAYER_ARN}" \
  --region "${REGION}" \
  --query "Content.Location" \
  --output text)

if [[ -z "${LOCATION}" || "${LOCATION}" == "None" ]]; then
  echo "[fetch-lambda-extensions] Failed to resolve layer download URL." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "[fetch-lambda-extensions] Downloading layer..."
curl -sSL "${LOCATION}" -o "${TMP_DIR}/layer.zip"

rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"
unzip -q "${TMP_DIR}/layer.zip" -d "${DEST_DIR}"

echo "[fetch-lambda-extensions] Layer extracted to: ${DEST_DIR}"
ls "${DEST_DIR}"
