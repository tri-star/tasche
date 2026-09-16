---
name: backend-env-not-initialized-blocks-docker-verification
description: worktree未初期化のセッションではpackages/backend/.envが存在せず、Edit/Bashからの.env書き込みは権限システムに拒否されるためdocker compose検証ができない(PR #110で確認)
metadata:
  type: project
---

`dependabot-update-resolver` が呼ばれるセッションで、オーケストレーター側の
worktree初期化(`scripts/initialize-dotenv.sh` や
`.claude/skills/tasche-worktree-init/scripts/create-env-file.sh`)が
実行されていない場合、`packages/backend/.env` が存在しないか、
`.env.example` をコピーしても `COMPOSE_PROJECT_NAME={%COMPOSE_PROJECT_NAME%}`
のようなプレースホルダのままになっている。

`docker compose up -d db` はこの状態だと
`invalid project name` や `invalid hostPort: {%DB_PORT%}` で失敗する。

## Why
プレースホルダを埋めるために `Edit`/`Bash sed` で `.env` を書き換えようとしたが、
**サンドボックスのファイルシステム制限ではなく、権限システム自体に `.env` への
書き込みが拒否**された(sandbox violationのメッセージは出ず、
単に "denied" というpermission denial)。`dangerouslyDisableSandbox` で
回避すべき類のものではない([[e2e_local_repro_under_sandbox]] に書いた
`~/.docker/config.json` permission deniedとは別の制約)。

## How to apply
- `dependabot-update-resolver` はworktreeの初期化(.env生成)を自分で行う
  スコープではない。`.env` が無い/プレースホルダのままの場合は、
  無理に `.env` を書き換えようとせず、まず `packages/backend/compose.yaml`
  の `env_file: required: false` 設定を確認する。ポート変数
  (`DB_CONTAINER_PORT`/`API_CONTAINER_PORT`) や `COMPOSE_PROJECT_NAME`
  はcompose.yaml側にデフォルト値(`${DB_CONTAINER_PORT:-5432}`等)が
  あるため、`.env` が完全に存在しない(コピーすらしていない)状態なら
  `docker compose up -d db` / `docker compose build --no-cache api` /
  `docker compose exec api ...` がデフォルトポートのまま成功することがある
  (PR #116で確認。ホスト側の5432/8000が空いていることが前提)。
  **`.env.example` をコピーしてプレースホルダ付きの `.env` を作ってしまうと
  `invalid hostPort: {%DB_PORT%}` 等で失敗するので、コピーせず `.env` 無しの
  ままにしておくのがコツ。**
- 上記でも失敗する場合(ポート衝突、あるいは `.env` が中途半端にコピー済みで
  プレースホルダが残っている等)は、無理に環境構築しようとせず、
  「backendの動作確認は環境未初期化のため実施できず、CIでの最終確認に委ねる」
  と正直に親エージェントへ報告する。
- 途中で `.env` を作った場合は gitignore対象(`packages/backend/.gitignore` に
  `.env` あり)なので、半端な `.env` は `rm` で片付けてから終了する
  (次回セッションに混乱を残さない)。検証に使ったdockerコンテナも
  `docker compose down` で片付けること。

関連: [[e2e_local_repro_under_sandbox]], [[backend_python_commands_use_docker_compose_exec]], [[pr116_backend_group_7_updates]]
