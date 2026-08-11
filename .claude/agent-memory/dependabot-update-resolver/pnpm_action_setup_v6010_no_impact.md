---
name: pnpm-action-setup-v6010-no-impact
description: pnpm/action-setup 6.0.9→6.0.10のpatch更新は修正不要と確認した記録(PR #102)
metadata:
  type: project
---

pnpm/action-setup を 6.0.9 → 6.0.10 に上げるPR (#102) は4つのworkflow
(deploy-frontend-dev.yml, deploy-frontend-prod.yml, frontend-ci.yml,
reusable-node-pnpm-run.yml) すべてでSHA固定コメントが正しく更新されており
(旧SHA 0ebf47130e4866e96fce0953f49152a61190b271 = v6.0.9,
新SHA 0977fd99725f1db4007ccb2928dbb4e90d06cc86 = v6.0.10、
GitHub Tags APIで実タグと一致確認済み)、ズレはなかった。

v6.0.10の変更点(README更新、pnpmを11.19.0に更新、cacheのrestore keys導入)は
いずれもaction自体のinput/output契約を変えるものではない。特に
「restore keys for cache」はpnpm/action-setup内部のキャッシュ実装の話で、
このリポジトリでは同actionのキャッシュ機能を使わず後続の
actions/setup-node の cache:pnpm を使う設計([[actions_setup_node_v7_upgrade]]
参照)のため無関係と判断した。

**Why:** patchバージョンでもSHA固定コメントのズレ([[github_actions_sha_pin_comment_drift]])
やキャッシュ挙動変更([[setup_uv_v9_prune_cache_default_change]])が過去に問題化した
実績があるため、patchでも念のため実SHA照合とリリースノート確認を省略しなかった。

**How to apply:** pnpm/action-setup の今後の更新でも、リポジトリ側がaction自身の
キャッシュ機能(cache input)を使っていない限り、cache関連のchangelogは無視してよい。
version input や run_install の挙動変更がないかだけ確認すれば十分。
