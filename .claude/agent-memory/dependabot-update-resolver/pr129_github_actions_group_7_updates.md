---
name: pr129-github-actions-group-7-updates
description: PR #129 github-actions-allグループ7件(setup-python 7.1/setup-uv 10.3.2/configure-aws-credentials 6.3/setup-sam SHA/pnpm action-setup 6.1/setup-node 7.1/upload-artifact 7.0.2)は修正不要
metadata:
  type: project
---

全てminor/patch。SHAとコメントのタグはTags APIで一致確認済み(setup-samは`# v3`の可動タグ)。CIも全通過。
- setup-sam: SHA更新はキャッシュ済みSAM CLIの整合性検証追加と`token`入力の既定値をgithub.tokenにしただけ。`use-installer: true`の既存設定に影響なし。
- pnpm/action-setup 6.1.0: pnpm v12サポート追加のみ。
- setup-uv 10.1-10.3.2: no_proxy対応、python-arch、merge queueでのキャッシュ保存無効化など追加のみ。
- configure-aws-credentials 6.3.0: translate-env-variablesオプション追加のみ。
How to apply: 同種のgithub-actions minor/patchグループは同様にリリースノート+Tags API照合+CI確認で足りる。関連: [[setup_uv_v10_no_impact]], [[github_actions_sha_pin_comment_drift]]
