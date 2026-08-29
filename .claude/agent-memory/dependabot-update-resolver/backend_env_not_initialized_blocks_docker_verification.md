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
  無理にdocker compose環境を構築しようとせず、「backendの動作確認は
  環境未初期化のため実施できず、CIでの最終確認に委ねる」と正直に
  親エージェントへ報告する。
- コピーした `.env` はgitignore対象(`packages/backend/.gitignore` に
  `.env` あり)なので、途中で作った半端な `.env` は `rm` で片付けてから
  終了する(次回セッションに混乱を残さない)。

関連: [[e2e_local_repro_under_sandbox]], [[backend_python_commands_use_docker_compose_exec]]
