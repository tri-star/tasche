#!/usr/bin/env bash
# AWS Parameters and Secrets Lambda Extension と ADOT Lambda layer の
# 署名付き download URL を解決する。
#
# コンテナイメージ Lambda は Lambda 設定経由で Layer をアタッチできないため、
# 公式ブログの手法 #2 に従い、Layer の中身をビルド時にイメージへ焼き込む。
# AWS 認証が必要な URL 解決だけを Docker の外で行い、download / unzip 自体は
# Dockerfile の中間ステージで実施する。
# https://aws.amazon.com/jp/blogs/compute/working-with-lambda-layers-and-extensions-in-container-images/
#
# 使い方:
#   eval "$(bash scripts/fetch-lambda-extensions.sh)"
# 必要な権限:
#   lambda:GetLayerVersion (公式 Layer も同権限が必要)

set -euo pipefail

# AWS Parameters and Secrets Lambda Extension (x86_64).
# Lambda 関数の Architectures は x86_64 のため、x86_64 用 Layer を取得する。
# (arm64 用は Layer 名末尾が `-Arm64` のもの。アーキテクチャ不整合だと
#  /opt/extensions/bootstrap で `exec format error` になるので注意.)
# バージョンは適宜更新する (公式 Layer の最新版に追従).
# 参考: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html
SECRETS_LAYER_ARN="${SECRETS_LAYER_ARN:-arn:aws:lambda:ap-southeast-1:044395824272:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11}"
# AWS Distro for OpenTelemetry Python Lambda layer with Application Signals support.
# 参考: https://aws-otel.github.io/docs/getting-started/lambda/
ADOT_LAYER_ARN="${ADOT_LAYER_ARN:-arn:aws:lambda:ap-southeast-1:615299751070:layer:AWSOpenTelemetryDistroPython:21}"
REGION="${REGION:-ap-southeast-1}"

fetch_layer() {
  output_name="$1"
  layer_arn="$2"

  echo "[fetch-lambda-extensions] Resolving ${output_name} layer download URL..." >&2
  local location
  location=$(aws lambda get-layer-version-by-arn \
    --arn "${layer_arn}" \
    --region "${REGION}" \
    --query "Content.Location" \
    --output text)

  if [[ -z "${location}" || "${location}" == "None" ]]; then
    echo "[fetch-lambda-extensions] Failed to resolve ${output_name} layer download URL." >&2
    exit 1
  fi

  printf '%s=%q\n' "${output_name}" "${location}"
}

fetch_layer "SECRETS_LAYER_URL" "${SECRETS_LAYER_ARN}"
fetch_layer "ADOT_LAYER_URL" "${ADOT_LAYER_ARN}"
