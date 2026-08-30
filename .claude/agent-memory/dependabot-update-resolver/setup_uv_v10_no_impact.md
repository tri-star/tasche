---
name: setup-uv-v10-no-impact
description: astral-sh/setup-uv v9→v10のメジャー更新は本リポジトリに影響なし。enable-cache:trueを明示済みのため新既定値の影響を受けない(PR #110)
metadata:
  type: project
---

`astral-sh/setup-uv` v9.0.0 → v10.0.1 (メジャーバージョンアップ) の
破壊的変更を調査した結果。

## v10.0.0 の破壊的変更
- `enable-cache: auto` (既定値) の場合、`pull_request_target` /
  `workflow_run` / `release` イベントでは自動的にキャッシュが
  無効化されるようになった (cache poisoning 対策)。
- 新オプション `version: "latest-known"` 追加(既知チェックサム付き最新版を使う選択肢)。
- `version-file` が `.tool-versions` も読めるようになった(追加のみ、既存動作への影響なし)。

## v10.0.1 (パッチ)
- 一時的なマニフェストタイムアウトに対する耐性向上のバグ修正のみ。破壊的変更なし。

## Why 影響なしと判断したか
`packages/backend/.github/workflows/backend-ci.yml` の2箇所
(backend-lint / backend-test) は `enable-cache: true` を**明示的に**
設定しており、`auto` (既定値) ではない。また実行トリガーも
`pull_request` (target ではない) のみなので、v10.0.0 の
「auto既定値でのキャッシュ無効化」変更の対象外。
`uv-version: "latest"` を使っており `latest-known` は使っていないが、
これはオプトイン機能で既存設定に影響しない。

## How to apply
- 今後 setup-uv をさらに更新する際も、`enable-cache` が `auto` のまま
  になっていないか([[setup_uv_v9_prune_cache_default_change]] で
  `prune-cache: true` は既に明示済み)を確認する。
- `pull_request_target` を使うワークフローが将来追加された場合は、
  この変更の影響を受けるため要注意。

関連: [[setup_uv_v9_prune_cache_default_change]], [[github_actions_sha_pin_comment_drift]]
