# ADR005: Backend Lambda パッケージング方式

- Status: Accepted
- Date: 2026-05-08

## Context

Tasche backend (FastAPI + Python) を AWS Lambda にデプロイするにあたり、パッケージング方式とローカル/Lambda の起動形態を決める必要があった。

候補:

1. **Mangum + Zip**: ASGI アダプタ Mangum で Lambda invocation event を FastAPI に変換。Zip 配布。
2. **Lambda Web Adapter (LWA) + コンテナイメージ**: AWS 公式の Lambda 拡張で uvicorn を実 HTTP サーバとして起動し、Lambda Runtime API ↔ HTTP のプロキシをする。コンテナイメージ配布。

要件:

- 将来 ADOT (AWS Distro for OpenTelemetry) を組み込む計画あり。FastAPI のルート粒度のスパンと、CloudFront → Function URL → アプリ間の trace context 伝播を素直に取りたい。
- ローカル開発と Lambda の挙動差異をなるべく小さくして、デバッグコストを抑えたい。
- Python/Lambda の経験は浅く、学習コストの低い方を選びたい。

## Decision

**Lambda Web Adapter + コンテナイメージ** を採用する。

- アプリケーションコードは Lambda 専用エントリポイントを持たない。`tasche.main:app` を ローカルでも Lambda でも uvicorn で起動する。
- パッケージは `packages/backend/Dockerfile` (本番用) を ECR にプッシュし、SAM で Lambda に紐付ける。
- `Dockerfile` は Lambda Web Adapter (`public.ecr.aws/awsguru/aws-lambda-adapter`) を `/opt/extensions/lambda-adapter` に COPY するのみで、アプリは何も変更しない。

## Consequences

### Positive

- FastAPI のルート粒度のスパン取得や trace context 伝播が、ASGI 層を踏まずに HTTP のまま動くため、ADOT 導入時の手当てが少なく済む。
- ローカル (Docker compose で uvicorn) と Lambda 上 (LWA + uvicorn) の起動形態が同じで、障害切り分けが容易。
- `Dockerfile` で依存を完全にロックできるため、native 拡張を含むライブラリを追加するときも安全。

### Negative / Trade-off

- Mangum + Zip と比べ、コールドスタートが約 0.5〜1 秒重い (実測ベース)。
  - 実用性に問題が出た場合は、Lambda SnapStart や warm-up cron で吸収する想定。
- **コンテナイメージ Lambda には Lambda 設定経由で Layer をアタッチできない**。
  - ただし AWS 公式ブログ "Working with Lambda layers and extensions in container images" の手法 #2 (Layer zip を `aws lambda get-layer-version-by-arn` 経由で取得して `/opt` 配下に焼き込む) でコンテナでも Extension を利用可能。
  - 本プロジェクトでは `packages/backend/scripts/fetch-lambda-extensions.sh` で AWS Parameters and Secrets Lambda Extension の Layer zip を CI で事前展開し、`Dockerfile` で `COPY build/lambda-extensions/ /opt/` してビルド時に焼き込んでいる。
  - これにより Lambda 上ではアプリケーションが `http://localhost:2773/secretsmanager/get?secretId=<ARN>` を叩くだけで、Extension の TTL キャッシュ (既定 5 分) が効きローテーション追従も自動化される。

### Future considerations

- ADOT 導入時は `opentelemetry-instrument uvicorn ...` で起動コマンドをラップする想定。`Dockerfile` の `CMD` を 1 行差し替えるだけで済む。
- コールドスタートが SLO を破る場合は SnapStart の有効化を検討する。

## References

- AWS Lambda Web Adapter: https://github.com/awslabs/aws-lambda-web-adapter
- AWS Lambda コンテナイメージと Layer の関係: https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html
- Working with Lambda layers and extensions in container images: https://aws.amazon.com/jp/blogs/compute/working-with-lambda-layers-and-extensions-in-container-images/
- 議事録: `docs/work-logs/20260508-deploy-pipeline/plan.md`
