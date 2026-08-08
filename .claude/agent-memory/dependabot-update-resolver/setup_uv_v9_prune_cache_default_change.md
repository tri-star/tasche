---
name: setup-uv-v9-prune-cache-default-change
description: astral-sh/setup-uv v8→v9でprune-cacheの既定値がtrue→falseに変更。enable-cache:trueなジョブはキャッシュ肥大化の恐れ(PR #96で対応)
metadata:
  type: project
---

`astral-sh/setup-uv` の v9.0.0 (2026-08頃リリース) で `prune-cache`
入力の既定値が `true` から `false` に変更された
(PyPIインフラへの負荷軽減が目的とのリリースノート記載、
`prune-cache` を `false` にするとキャッシュ削減を行わなくなる)。

## Why
`packages/backend` のCI (`backend-ci.yml`) は
`enable-cache: true` で uv のキャッシュを有効化しているが、
`prune-cache` を明示していなかったため、v9系にアップデートすると
暗黙的にキャッシュがプルーニングされなくなり、GitHub Actions の
キャッシュ使用量が増加する可能性がある。CIが落ちるような
破壊的変更ではないが、コスト面の意図しない挙動変化のため
明示的に `prune-cache: true` を追加して従来挙動を維持する対応をした。

## How to apply
- setup-uv がメジャーアップデートされた際は、release notes の
  「🚨 Breaking changes」セクションを必ず確認する
  (https://github.com/astral-sh/setup-uv/releases)。
- `enable-cache: true` を使っている全ジョブ
  (`backend-ci.yml` の backend-lint / backend-test 2箇所)に
  `prune-cache: true` を追加済み。今後 setup-uv をさらに更新する際、
  この設定が意図せず削除されていないか確認すること。

関連: [[github_actions_sha_pin_comment_drift]]
