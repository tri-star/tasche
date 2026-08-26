---
name: backend-fresh-worktree-needs-own-env-file
description: 新しいorca worktree(auto-tasche-dependabot-run-*)ではpackages/backend/.envが存在しないため、docker composeを動かす前に.env.exampleを元に一意なCOMPOSE_PROJECT_NAME/ポートで新規作成する必要がある
metadata:
  type: project
---

`packages/backend/.env` は `.gitignore` されており、新規にcloneされたorca worktree
（例: `auto-tasche-dependabot-run-67-20260826T2330`）には存在しない。`.env.example` には
`COMPOSE_PROJECT_NAME` / `DB_CONTAINER_PORT` / `API_CONTAINER_PORT` / `E2E_API_CONTAINER_PORT`
がプレースホルダ（`{%...%}`）のまま残っており、これをコピーしただけでは `docker compose` は
動かせない。

**確認方法**: `docker ps -a` で他worktree（`tasche-*`, `auto-tasche-dependabot-run-66-*` 等）が
使用中のポートを確認し（このマシンでは 4100-4103, 4161-4163 などが既存run用に使用済みだった）、
重複しない値を選ぶ。`COMPOSE_PROJECT_NAME` を worktree名に対応した一意な値にすることで、
コンテナ名・ネットワーク名・volume名の衝突も避けられる。

```bash
cat > packages/backend/.env <<'EOF'
COMPOSE_PROJECT_NAME=auto-tasche-dep-run67
DB_CONTAINER_PORT=4171
API_CONTAINER_PORT=4172
E2E_API_CONTAINER_PORT=4173
DATABASE_URL=postgresql+asyncpg://tasche:tasche_dev_password@localhost:4171/tasche
APP_ENV=local
GOOGLE_OAUTH_CLIENT_ID=dummy
GOOGLE_OAUTH_CLIENT_SECRET=dummy
GOOGLE_OAUTH_REDIRECT_URIS=http://localhost:4103/auth/callback
SESSION_EXPIRES_SECONDS=604800
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
CORS_ALLOW_ORIGINS=http://localhost:4103
AUTH_STUB_ENABLED=true
LOG_LEVEL=debug
EOF
```

**注意点**: `.env` の `DATABASE_URL` はホストから接続する想定で `localhost:<DB_CONTAINER_PORT>` を
指す。`api` コンテナはこの値をそのまま環境変数として受け取るため、コンテナ内で
`alembic upgrade head` 等を単発実行する際は `docker compose exec -e DATABASE_URL=postgresql+asyncpg://tasche:tasche_dev_password@db:5432/tasche api ...`
のようにコンテナ内DBホスト名 `db:5432` へ明示的に上書きする必要がある（そうしないと
`OSError: Multiple exceptions: [Errno 111] Connect call failed` でホスト側ポートへの接続を
試みて失敗する）。`api` サービス自体の起動時は compose.yaml 側で `TEST_DATABASE_URL` のみ
`db:5432` に上書きされているが `DATABASE_URL` は上書きされていないため、この罠は
`docker compose exec api <alembicコマンド>` を単発で叩くときに特に発生しやすい。

作業終了後は `docker compose down` でコンテナ・ネットワークを片付けること（volumeは
`postgres_data` として永続化されるが、他worktreeと名前が衝突しないため放置してもリスクは低い）。

Why: dependabot-update-resolver は「親エージェントが既にコンテナを起動済み」の前提で書かれた
既存メモ（[[backend_python_commands_use_docker_compose_exec]] 等）が多いが、実際には
worktreeが真っさらでコンテナ未起動・`.env`未作成のケースもある（PR #103 マージ後検証、
2026-08-27）。

How to apply: `docker compose ps` でコンテナが存在しない、かつ `packages/backend/.env` が
存在しない場合は、まず本メモの手順で `.env` を新規作成してから
[[backend_dev_container_needs_rebuild_after_pyproject_change]] の手順（build → up）に進むこと。

関連: [[backend_python_commands_use_docker_compose_exec]],
[[backend_dev_container_needs_rebuild_after_pyproject_change]]
