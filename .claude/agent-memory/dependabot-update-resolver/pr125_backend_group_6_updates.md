---
name: pr125-backend-group-6-updates
description: PR#125 (fastapi 0.143/asyncpg 0.32/alembic 1.20/aws-opentelemetry-distro 0.21/ruff 0.17/cryptography 50.0.2)は修正不要と判断した根拠と、dockerが使えない環境でのpytest代替手順
metadata:
  type: project
---

PR #125 (`backend-minor-patch` グループ、`uv.lock` のみ変更、6パッケージ) は修正不要と判断した。

| パッケージ | 変更 | 破壊的変更 | 本リポジトリへの影響 |
| --- | --- | --- | --- |
| fastapi | 0.141.1→0.143.0 | 0.142.0でネイティブOTel対応追加、0.143.0でFastAPIによるOTLP exporter自動設定がopt-in化(`FASTAPI_OTEL_AUTO_CONFIGURE=true`) | exporterはLambda上の`AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument`(ADOT)が設定し、FastAPI側の自動設定には依存していない。`OTEL_EXPORTER_OTLP_*`もtemplate.yaml/compose.yamlに無し。ネイティブspanも`_legacy_otel()`が`opentelemetry.instrumentation.asgi.OpenTelemetryMiddleware`を検出して譲るため、`main.py`の`FastAPIInstrumentor.instrument_app`と二重にならない。`iter_route_contexts()`系の修正(0.143.1)もmain.pyは既に利用済み |
| asyncpg | 0.31.0→0.32.0 | プール`min_size`が維持下限化(`init_size`追加) | SQLAlchemy経由のみで`asyncpg.create_pool`は直接使っていないため無関係 |
| alembic | 1.19.2→1.20.0 | SQLAlchemy 1.4サポート削除(2.0以上必須) | 本リポジトリはSQLAlchemy 2系。`alembic upgrade head`成功 |
| aws-opentelemetry-distro | 0.19.0→0.21.0 | 0.20で実験的code-levelアトリビュート削除、openai-agents-v2依存削除、0.21でCloudWatch Metrics用SigV4追加 | 利用側のコード/環境変数に該当なし |
| ruff | 0.16.6→0.17.0 | デフォルトPython 3.11、DTZ一部ルールをデフォルト無効化、F406追加、行長計算でpragmaコメント無視 | `ruff check .` / `ruff format . --check`全通過(107ファイル) |
| cryptography | 50.0.1→50.0.2 | なし | 影響なし |

## 検証方法(docker socketがsandboxで使えない場合の代替)
`/var/run/docker.sock`はsandbox内で権限拒否される。以下で代替してpytest 161件・alembic成功を確認できた。
- `UV_PROJECT_ENVIRONMENT=$TMPDIR/venv uvx --from 'uv>=0.9' uv sync --frozen --all-extras` でホストにvenv作成(ホストuvは古いので`uvx`経由)
- Postgresは`uv pip install pgserver`のバイナリ(`.../pgserver/pginstall/bin`)を使い、`initdb`後に
  `pg_ctl ... -o "-p 54329 -c unix_socket_directories= -c listen_addresses=127.0.0.1"` で起動(UNIXソケット作成がsandboxで禁止されているため空指定が必須。`pgserver.get_server()`は/run配下書き込みで失敗する)
- sandboxはコマンドごとにバックグラウンドプロセスを殺すため、pg起動・pytest・停止を**同一Bashコマンド内**で行う
- pytestには compose.yaml の api サービス相当の環境変数が必要(`ENABLE_TEST_AUTH=true AUTH_STUB_ENABLED=true APP_ENV=local DATABASE_URL/TEST_DATABASE_URL GOOGLE_OAUTH_* COOKIE_*`)。無いと404/接続エラーで大量失敗する

関連: [[pr116_backend_group_7_updates]], [[fastapi_0137_router_tree_regression]], [[backend_python_commands_use_docker_compose_exec]]
