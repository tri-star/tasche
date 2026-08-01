---
name: e2e-local-repro-under-sandbox
description: サンドボックス環境では `pnpm test:e2e` (docker compose up / playwright install) がpermission deniedで動かない。代わりにexecベースの手順とplaywright直接実行で代替する
metadata:
  type: project
---

`packages/frontend/scripts/run-e2e-with-backend.mjs` (= `pnpm test:e2e`) は内部で
`docker compose up -d --no-recreate db` や `--force-recreate api-e2e` を呼ぶが、この
エージェントのBashサンドボックスでは `~/.docker/config.json` の読み取りが拒否されており、

```
WARNING: Error loading config file: open /home/.../.docker/config.json: permission denied
unable to get image 'postgres:17-alpine': permission denied while trying to connect to the docker API
```

で `docker compose up` が失敗する(`docker compose ps` や `docker compose exec` のような
既存コンテナに対する読み取り/実行系コマンドは問題なく動く)。同様に `pnpm exec playwright install`
によるブラウザダウンロードも、Playwrightのダウンロード先ホストがネットワークsandboxの許可リストに
含まれておらず、バックグラウンドで無反応のままハングする(タイムアウトしても出力が空になる)。

**Why:** dependabot-update-workflow は「セットアップ済みのコンテナがすでに起動している」前提
(親エージェントが事前に `docker compose up` 済み)で動くことが多いため、`docker compose up`
自体を呼ばずに済ませられる場合が多い。

**How to apply:** E2Eをローカルで再現・検証したい場合、以下の手順で `run-e2e-with-backend.mjs`
の中身を手動で代替するとサンドボックス制限を回避できる。

1. `docker compose ps` で `db` / `api-e2e` が既に起動しているか確認する(起動済みならstep2以降だけで足りる)。
2. `cd packages/backend && docker compose exec -T api-e2e alembic upgrade head`
3. `docker compose exec -T api-e2e python scripts/e2e_seed/reset.py`
4. `docker compose exec -T api-e2e python scripts/e2e_seed/run.py`
5. `packages/frontend/.env` から `E2E_API_CONTAINER_PORT`(通常 backend の `.env` 側)相当の
   ホストポートを確認し(このリポジトリでは`E2E_BACKEND_API_PORT`環境変数、初期化スクリプトでは4001など)、
   `cd packages/frontend && E2E_USE_MSW=false VITE_USE_MSW=false E2E_API_BASE_URL=http://localhost:<port> VITE_API_BASE_URL=http://localhost:<port> pnpm exec playwright test`
   を直接実行する(=スクリプトの `runPlaywright()` を手動再現)。

ブラウザバイナリが `@playwright/test` のバージョンと合っていない場合(例: PR #99で
`chromium_headless_shell-1234` が見つからない)、このサンドボックスからは
`pnpm exec playwright install` でも新バイナリを取得できないため、E2Eの成功/失敗を
最後まで手元で確認しきることはできない。その場合は[[playwright_version_docker_image_pin]]の
ようにCI側の設定(Dockerイメージタグ等)が実バージョンと一致しているかを検証することで代替する
(CIのGitHub-hosted runnerはネットワーク制限がないため、そちらで最終確認される)。
