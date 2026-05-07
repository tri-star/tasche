# Tasche Backend 本番用 Dockerfile
#
# 構成:
#   - Lambda Web Adapter (LWA) を /opt/extensions に配置 → Lambda 起動時に
#     uvicorn を HTTP サーバとして起動し、Lambda Runtime API ↔ HTTP をプロキシ
#   - Parameters and Secrets Lambda Extension は SAM 側で Layer として
#     アタッチする（コンテナ Lambda でも Layers 指定可）
#   - 本番では `uv pip install --system .` で dev 依存を含めない
#
# 参考: docs/work-logs/20260508-deploy-pipeline/plan.md

FROM python:3.12-slim AS builder

WORKDIR /build

# uv インストール
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 依存関係解決のための最小ファイルをコピー
COPY pyproject.toml uv.lock ./
COPY src ./src

# 本番依存のみインストール（dev/test extras は含めない）
RUN uv pip install --system --no-cache-dir .

# ----------------------------------------------------------------------------

FROM python:3.12-slim

# Lambda Web Adapter を取り込む
# AWS_LWA_PORT で uvicorn の待ち受けポートを LWA に通知する
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

# Python 依存とアプリケーションコードを builder ステージから複製
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=builder /build/src /var/task/src

ENV PYTHONPATH=/var/task/src \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    SECRETS_BACKEND=extension \
    PORT=8080

WORKDIR /var/task

EXPOSE 8080

# uvicorn を起動。LWA が Lambda Runtime API からのイベントを HTTP に変換して送ってくる
CMD ["uvicorn", "tasche.main:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
