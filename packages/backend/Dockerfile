# Tasche Backend 本番用 Dockerfile
#
# 構成:
#   - Lambda Web Adapter (LWA): /opt/extensions に配置 → Lambda 起動時に
#     uvicorn を HTTP サーバとして起動し、Lambda Runtime API ↔ HTTP をプロキシ
#   - AWS Parameters and Secrets Lambda Extension / ADOT Lambda layer: Layer zip を事前に
#     `build/lambda-extensions/` に展開しておき、ここから /opt にコピー
#     (コンテナ Lambda は Layer の中身をビルド時に焼き込む)
#     展開は scripts/fetch-lambda-extensions.sh を CI/事前ステップで実行する
#   - 本番では `uv pip install --system .` で dev 依存を含めない
#
# 参考:
#   - docs/adr/ADR-005-backend-lambda-packaging.md
#   - https://aws.amazon.com/jp/blogs/compute/working-with-lambda-layers-and-extensions-in-container-images/

FROM --platform=linux/amd64 ghcr.io/astral-sh/uv:latest AS uv

FROM --platform=linux/amd64 python:3.12-slim AS builder

WORKDIR /build

# uv インストール
COPY --from=uv /uv /usr/local/bin/uv

# 依存関係解決のための最小ファイルをコピー
COPY pyproject.toml uv.lock ./
COPY src ./src

# 本番依存のみインストール（dev/test extras は含めない）
RUN uv pip install --system --no-cache-dir .

# ----------------------------------------------------------------------------

FROM --platform=linux/amd64 public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 AS lambda-adapter

FROM --platform=linux/amd64 python:3.12-slim

# Lambda Web Adapter を取り込む
# AWS_LWA_PORT で uvicorn の待ち受けポートを LWA に通知する
COPY --from=lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

# AWS Parameters and Secrets Lambda Extension と ADOT Lambda layer を /opt 直下へ展開
# build/lambda-extensions/ 下には Layer zip 展開後の extensions/ ディレクトリ等が含まれる前提
COPY build/lambda-extensions/ /opt/

# Python 依存とアプリケーションコードを builder ステージから複製
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=builder /usr/local/bin/opentelemetry-instrument /usr/local/bin/opentelemetry-instrument
COPY --from=builder /build/src /var/task/src
COPY scripts/start-backend.sh /var/task/scripts/start-backend.sh

ENV PYTHONPATH=/var/task/src \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    SECRETS_BACKEND=extension \
    PORT=8080

WORKDIR /var/task

EXPOSE 8080

# uvicorn を起動。AWS 環境では start-backend.sh が必要な場合のみ ADOT でラップする。
CMD ["sh", "/var/task/scripts/start-backend.sh"]
