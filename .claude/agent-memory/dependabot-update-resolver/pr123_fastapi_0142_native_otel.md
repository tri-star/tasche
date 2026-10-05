---
name: pr123-fastapi-0142-native-otel
description: FastAPI 0.142のネイティブOTelは既存instrumentorと共存可能だが、OTLP環境変数があるとauto_configureが追加エクスポータを登録する。auto_configure=Falseで対処(PR #123)
metadata:
  type: project
---

fastapi 0.142.0でネイティブOTel追加。contrib `OpenTelemetryMiddleware`を検出すると(`_legacy_otel`)ネイティブのtracing/logs/metricsは自動で無効化されるためスパン重複なし(実測: サーバスパン1つ、http.route正常)。ただし `_configure_from_environment` はOTLPエンドポイント環境変数があると既存プロバイダ(ADOT管理)へ追加エクスポータを登録する(二重送信リスク)。

**対処**: `FastAPI(telemetry={"auto_configure": False})` を main.py に追加、fastapi下限を>=0.142.0に(uv.lockのspecifier行も手編集)。
**Why:** ADOTがプロバイダ管理。本番のOTEL環境変数はリポジトリ外(infra)で不明なため防御的に対処。
**How to apply:** 同グループのPR(aws-opentelemetry-distro 0.19→0.21: openai-agents-v2依存削除/experimental code attributes削除のみ、alembic 1.20: SQLAlchemy1.4サポート終了のみ(本リポジトリは>=2.0.51))は修正不要。ホストuvは"2 days"を解釈できないのでuv.lock再生成せず手編集。ローカルのpytestはDB無しだと全件ERRORになるためCIで代替。
