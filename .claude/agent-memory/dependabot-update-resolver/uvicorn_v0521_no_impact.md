---
name: uvicorn-v0521-no-impact
description: uvicorn 0.51.0→0.52.1 (PR #104)は破壊的変更なし、修正不要と判断した根拠
metadata:
  type: project
---

PR #104 (`uvicorn[standard]>=0.51.0` → `>=0.52.1`) は修正不要と判断した。

- 0.52.0: 実験的HTTP/1.1バックエンド `zttp` 追加(`--http zttp`、本番非推奨)、websockets 17.0との互換性修正(非ASCIIヘッダーのISO-8859-1処理)。破壊的変更・非推奨化なし。
- 0.52.1: WebSocketクローズハンドシェイク関連のバグ修正4件のみ(`websockets-sansio`/`wsproto`実装のクローズ待機・書き込みフロー制御・バックプレッシャー・重複ヘッダー)。CVE修正の記載なし。
- リポジトリでの利用箇所(`compose.yaml`のCLI起動、`Dockerfile`/`scripts/start-backend.sh`のLambda Web Adapter経由起動、`--host`/`--port`/`--reload`/`--no-access-log`などのCLIオプション、`main.py`のlifespan設計)はいずれも今回のリリースで変更されたAPI/フラグに該当せず影響なし。
- standard extras (uvloop/httptools/watchfiles/websockets) はuv.lock上バージョン変化なし。

検証: `docker compose build api && up -d`後、`uv run pytest`161件全通過、`ruff check`/`ruff format --check`全通過、`/health`が200、コンテナログにERROR/Tracebackなし。実際に解決されたuvicornは0.52.3(制約 `>=0.52.1` を満たす最新)。

関連: [[backend_dev_container_needs_rebuild_after_pyproject_change]], [[stale_dependabot_branch_diff_apply_pitfall]]
