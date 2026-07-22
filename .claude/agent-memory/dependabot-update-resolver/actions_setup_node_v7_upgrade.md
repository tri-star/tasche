---
name: actions-setup-node-v7-upgrade
description: actions/setup-node v6→v7メジャー更新の互換性調査結果、修正不要と判断した根拠(PR #91)
metadata:
  type: project
---

actions/setup-node を v6.4.0→v7.0.0 に上げた際(PR #91)、入出力インターフェースの破壊的変更はなし。
主な変更点はESM移行・`@actions/cache`を5.1.0に更新・`cache-primary-key`/`cache-matched-key`出力追加・ダミーの
`NODE_AUTH_TOKEN` export削除・`mirrorToken`未指定時の挙動修正のみ。

action.yml の `runs.using` は v7 で `node24` に変更されているが、GitHub-hosted `ubuntu-latest` ランナーは
node24ランタイムに対応済みのため影響なし(自前ホストランナーでNode24未対応の古いRunnerを使っている場合は要注意)。

このリポジトリの5つのワークフロー(deploy-frontend-dev/prod, frontend-ci, pr-ai-review,
reusable-node-pnpm-run)はいずれも `node-version` と `cache: pnpm` のみを指定するシンプルな使い方で、
`always-auth` / `registry-url` / `mirror` 等の非推奨・変更対象オプションは未使用。

**Why:** メジャーバージョンでも実際の破壊的変更が使用箇所に影響するかどうかは必ず個別に確認する必要がある。
setup-node系の更新は今後も頻繁に来るため、次回以降は「node24ランタイム要求」の部分だけ確認すればよい。

**How to apply:** actions/setup-node のメジャー更新PRが来た場合、まずこのメモのnode24要件を確認し、
自前ホストランナーを使っていないか(`runs-on`)をチェックする。ubuntu-latest/windows-latest/macos-latest等の
GitHub-hosted runnerであれば追加調査不要。
