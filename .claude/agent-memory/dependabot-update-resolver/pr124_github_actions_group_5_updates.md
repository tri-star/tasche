---
name: pr124-github-actions-group-5-updates
description: PR #124 github-actions-allグループ5件(setup-uv 10.3.0/configure-aws-credentials 6.3.0/pnpm action-setup 6.1.0/setup-node 7.1.0/upload-artifact 7.0.2)は全て修正不要
metadata:
  type: project
---

全てminor/patchで破壊的変更・既定値変更なし。ワークフロー修正は不要と判断(PR #124)。

- setup-uv 10.0.1→10.3.0: 10.1 でNO_PROXY尊重・`python-runtime-id`出力追加、10.2 でmerge queueのキャッシュ保存無効化、10.3 で`python-arch`入力追加。既存の`enable-cache: true`明示設定に影響なし。
- configure-aws-credentials 6.2.3→6.3.0 (6.2.4経由): 6.2.4はaccount-ids処理・バックオフのバグ修正、6.3.0は`translate-env-variables`オプション追加(オプトイン)。本リポジトリは`role-to-assume`/`aws-region`のみ使用で影響なし。
- pnpm/action-setup 6.0.10→6.1.0: pnpm v12対応の追加のみ。
- actions/setup-node 7.0.0→7.1.0: mise.toml対応・node-version-file絶対パス対応・Nodeバージョン検証とmanifest取得リトライ。入力は`node-version`のみ使用で影響なし。
- actions/upload-artifact 7.0.1→7.0.2: 429時のリトライ改善、@actions/artifact 6.3.1。

**Why:** デプロイ系ワークフローはPRで実行されないため、入力値(静的)とリリースノートの突き合わせで判断した。
**How to apply:** SHAピンは注釈付きタグ(pnpm/action-setup)だと`git/ref/tags`がtagオブジェクトを返すので`git/tags/<sha>`で逆引きすること。upload-artifactのコメントは`# v7`のままでSHAのみ更新される(ズレではなくメジャータグ追従)。関連: [[github_actions_sha_pin_comment_drift]], [[setup_uv_v10_no_impact]]
