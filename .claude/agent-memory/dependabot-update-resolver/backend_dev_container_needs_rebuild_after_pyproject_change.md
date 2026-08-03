---
name: backend-dev-container-needs-rebuild-after-pyproject-change
description: packages/backend の compose.yaml は pyproject.toml/uv.lock をvolumeマウントしないため、依存バージョン変更を反映するには docker compose build api が必要
metadata:
  type: project
---

`packages/backend/compose.yaml` の `api`/`api-e2e` サービスは `./src`, `./migrations`, `./scripts`, `./alembic.ini`, `./openapi.json`, `./ruff.toml` のみをvolumeマウントしており、`pyproject.toml` と `uv.lock` はマウントされない（`Dockerfile.dev` のビルド時に `COPY pyproject.toml ./` されるだけ）。

**Why:** Dependabotが `pyproject.toml`/`uv.lock` の依存バージョンを更新したPRをチェックアウトしても、既存の起動済みコンテナは古いイメージ（古い依存バージョン）のままで、`docker compose exec api ...` で確認すると更新前のバージョンが表示される（例: PR #93でuvicornを0.49.0→0.51.0に上げたが、コンテナ内は0.49.0のままだった）。また `Dockerfile.dev` は `uv pip install --system -e ".[dev]"` を使っており `uv.lock` を使ったsync/checkは行わない。CI（`.github/workflows/backend-ci.yml`）も `uv pip install -e ".[dev]"` のみで `uv lock --check` は実行しておらず、`uv.lock` の一貫性はCIで強制されていない。

**How to apply:** backendの依存関係を変更するPRを検証する際は、`cd packages/backend && docker compose build api` でイメージを再ビルドしてから `docker compose up -d api` で再起動し、`docker compose exec api python -c "import <pkg>; print(<pkg>.__version__)"` 等で実際に新バージョンが反映されているか確認すること。マウントされたファイルだけを見て「反映されているはず」と判断しない。[[backend_python_commands_use_docker_compose_exec]]
