# packages/backend ADOT Observability Plan

## Summary

`packages/backend` の AWS Lambda コンテナ環境に ADOT / OpenTelemetry を組み込み、FastAPI の API エンドポイント単位でトレースを取得し、CloudWatch Logs のログと trace/span ID で相関できるようにする。

ローカル環境ではテレメトリを取得しない。AWS 環境のみ `ENABLE_TELEMETRY=true` で有効化する。

X-Ray SDK / X-Ray daemon は使わない。AWS X-Ray SDK/daemon は 2026-02-25 からメンテナンスモードに入っているため、計装は OpenTelemetry / ADOT に寄せる。AWS 側の確認先は CloudWatch Application Signals / CloudWatch Transaction Search を主軸にする。

## Current Backend Context

- Backend は FastAPI + Lambda Web Adapter + Lambda コンテナイメージで動作する。
- 本番 Dockerfile は `packages/backend/Dockerfile`。
- Lambda は zip 形式ではないため、Lambda Layer を設定でアタッチするのではなく、必要な実行物・依存関係をコンテナイメージに組み込む。
- 既存の Parameters and Secrets Lambda Extension も `scripts/fetch-lambda-extensions.sh` と Dockerfile でコンテナへ焼き込んでいる。
- SAM template は `packages/backend/infra/template.yaml`。
- ローカル開発は `packages/backend/Dockerfile.dev` と `packages/backend/compose.yaml` を使う。

## Key Decisions

- X-Ray SDK / X-Ray daemon は導入しない。
- アプリ計装は ADOT / OpenTelemetry Python auto-instrumentation を使う。
- AWS 上の可視化は CloudWatch Application Signals / CloudWatch Transaction Search を主軸にする。
- AWS 側の OTLP 取り込み口として X-Ray/CloudWatch 系 endpoint を使う可能性はあるが、アプリコードは X-Ray SDK に依存させない。
- OTLP endpoint は環境変数で差し替え可能にして、将来 AWS の推奨経路が変わっても追従しやすくする。
- `/health` と `/` はトレース対象外にして、Lambda Web Adapter readiness check のノイズを減らす。

## Implementation Changes

### Dependencies

- `packages/backend/pyproject.toml` の本番依存に ADOT / OpenTelemetry 関連パッケージを追加する。
- 想定する依存は以下。
  - `aws-opentelemetry-distro`
  - `opentelemetry-instrumentation-fastapi`
  - `opentelemetry-instrumentation-logging`
  - 必要に応じて `opentelemetry-exporter-otlp-proto-http`
- 依存追加後に `uv.lock` を更新する。

### Runtime Entrypoint

- 本番 Docker 起動を小さな entrypoint script 経由に変更する。
- AWS Distro for OpenTelemetry Python Lambda layer を既存の Lambda Extension 取得処理に追加し、コンテナの `/opt` 配下へ焼き込む。
- `ENABLE_TELEMETRY=true` の場合のみ、`/opt/otel-instrument` が存在すればそれを優先し、なければ `opentelemetry-instrument uvicorn tasche.main:app ...` で起動する。
- `ENABLE_TELEMETRY` 未設定または false の場合は従来通り `uvicorn tasche.main:app ...` で起動する。
- entrypoint でも既存の uvicorn 引数を維持する。
  - `--host 0.0.0.0`
  - `--port 8080`
  - `--no-access-log`
- `Dockerfile.dev` / `compose.yaml` には `ENABLE_TELEMETRY=true` を設定しない。

### SAM Environment

`packages/backend/infra/template.yaml` の `BackendFunction.Environment.Variables` に AWS 環境用の OTEL 設定を追加する。

最低限追加する変数:

```yaml
ENABLE_TELEMETRY: "true"
AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-instrument
OTEL_SERVICE_NAME: tasche-backend
OTEL_RESOURCE_ATTRIBUTES: !Sub "service.name=tasche-backend,deployment.environment=${Env},aws.log.group.names=/aws/lambda/${Env}-tasche-backend"
OTEL_AWS_APPLICATION_SIGNALS_ENABLED: "true"
OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: none
OTEL_LOGS_EXPORTER: console
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED: "true"
OTEL_PYTHON_LOG_CORRELATION: "true"
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS: "^/health$,^/$"
```

AWS Lambda layer の embedded agent から CloudWatch / Application Signals に送る。CloudWatch Logs との相関は `OTEL_LOGS_EXPORTER=console` と logging instrumentation により、Lambda application log group に trace/span ID を含むログを出す方針にする。

### Logging

- `packages/backend/src/tasche/main.py` の `logging.basicConfig` は、AWS テレメトリ有効時だけ `otelTraceID` / `otelSpanID` を含む形式に切り替える。
- ローカルでは現在のログ形式を維持する。
- 例:

```python
if settings.enable_telemetry:
    log_format = "%(asctime)s - %(name)s - %(levelname)s - trace_id=%(otelTraceID)s span_id=%(otelSpanID)s - %(message)s"
else:
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
```

- `Settings` に `enable_telemetry: bool = False` を追加し、環境変数 `ENABLE_TELEMETRY` で制御する。

### IAM / External Infra Requirements

Lambda 実行ロールは外部リポジトリで管理されているため、このリポジトリでは必要権限をドキュメントに明記する。

最低限必要な権限:

- trace 送信用の権限。AWS X-Ray OTLP endpoint を使う場合は `AWSXrayWriteOnlyPolicy` 相当。
- CloudWatch Logs OTLP 送信用の権限。
- Application Signals / Transaction Search を利用する場合に追加で必要な CloudWatch 権限。

外部IaC側での作業漏れを防ぐため、`docs/deploy/ssm-naming.md` または deploy 関連 docs に追記する。

### Deploy Workflow Alignment

- `.github/workflows/deploy-backend-dev.yml` の `DOCKER_DEFAULT_PLATFORM` は `linux/amd64` に揃える。
- 現在の `packages/backend/Dockerfile` は `--platform=linux/amd64`、SAM template は `Architectures: [x86_64]` のため、CI側だけ `linux/arm64` のままだとコンテナ拡張追加時に事故りやすい。

## Acceptance Criteria

- AWS 環境で FastAPI に対するトレースを取得できる。
- `/api/*` の API エンドポイント単位で span が分かれる。
- URL / route / method / status code でフィルターできる。
- CloudWatch Logs 上のアプリログに trace/span ID が含まれる。
- ログから該当トレースへ辿れる、または同じ trace ID で検索できる。
- `/health` と `/` は主要APIトレースのノイズにならない。
- ローカル Docker Compose 起動ではテレメトリ送信されない。

## Test Plan

### Local / CI

- `uv lock` 更新後、backend の pytest を実行する。
- backend の ruff check を実行する。
- `ENABLE_TELEMETRY=false` の本番イメージ起動で `/health` が通ることを確認する。
- `ENABLE_TELEMETRY` 未設定のローカル compose 起動で OTLP 送信が発生しないことを確認する。
- `sam build --config-env dev` が成功することを確認する。

### AWS dev

- dev 環境へデプロイする。
- 以下のような複数 API を叩く。
  - `GET /api/dashboard`
  - `GET /api/tasks`
  - `GET /api/weeks/current/goals`
  - 認証が必要な API ではログイン済みセッションで確認する。
- CloudWatch Application Signals / Transaction Search で `service.name=tasche-backend` を確認する。
- endpoint / URL / method / status code でフィルターできることを確認する。
- CloudWatch Logs で対象リクエストの `trace_id` / `span_id` を確認し、トレースと相関できることを確認する。

## Risks / Watch Points

- AWS X-Ray SDK / daemon はメンテナンスモード入り済みなので使わない。
- AWS X-Ray サービス自体の廃止は確認されていないが、設計の中心は OpenTelemetry / ADOT とする。
- CloudWatch Logs OTLP endpoint のロググループ/ログストリーム指定は AWS 側仕様に依存するため、実装時に公式ドキュメントで再確認する。
- Lambda Web Adapter readiness check の `/health` がトレースに大量混入しないよう、除外設定を必ず入れる。
- `opentelemetry-instrument` によって起動時間・コールドスタートが増える可能性があるため、dev 環境でコールドスタートを確認する。
- 既存の Parameters and Secrets Lambda Extension と ADOT instrumentation の初期化順が競合しないか確認する。

## References

- AWS X-Ray SDK and daemon timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- CloudWatch Transaction Search: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Transaction-Search.html
- CloudWatch Application Signals for Lambda: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-LambdaMain.html
- CloudWatch OTLP with ADOT: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-OTLP-UsingADOT.html
- OpenTelemetry FastAPI instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
