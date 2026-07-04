---
name: backend-python-commands-use-docker-compose-exec
description: backend(packages/backend)のPython系コマンド(pytest/ruff等)はホスト直接実行ではなくdocker compose exec api経由で実行する
metadata:
  type: feedback
---

backend関連のPython系コマンド（`uv run pytest`、`uv run ruff` 等）は、ホストマシンから直接実行するのではなく、`docker compose exec api <command>` の形でコンテナ内実行を優先すること。

**Why:** PR #66（uvicornアップデート）の作業時、ホストから直接 `uv run pytest` を実行したところ、DBコンテナのポート（例: 4102）へ `ConnectionRefusedError` が発生した。`nc -zv localhost <port>` では疎通できていたにもかかわらずasyncpg接続だけ失敗しており、サンドボックス環境のネットワーク挙動に起因すると見られる不安定さがあった。一方 `docker compose exec api uv run pytest -q` はコンテナ内ネットワーク（`db`ホスト名）を使うため安定して成功した（161 passed）。ユーザーからも今後この方針を徹底するよう明示的な指示があった。

**How to apply:** dependabot-update-workflow配下でbackendのテスト・lint・format確認を行う際は、まず `docker compose -f packages/backend/compose.yaml up -d db` でDBを起動し、その後は `docker compose -f packages/backend/compose.yaml exec api uv run pytest -q` / `... exec api uv run ruff check .` / `... exec api uv run ruff format . --check` のようにapiコンテナ経由で実行する。ホスト直接実行（`TEST_DATABASE_URL=...localhost:<port>... uv run pytest`）は最終手段とし、失敗した場合はまずコンテナ経由に切り替えて再試行する。
