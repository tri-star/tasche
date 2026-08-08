---
name: github-actions-sha-pin-comment-drift
description: GitHub ActionsのSHA固定コメント(# vX.Y.Z)がDependabotのメジャー更新で追従せず古いまま残ることがある。更新PRごとに実際のタグと照合が必要(PR #96で発覚)
metadata:
  type: project
---

このリポジトリの `.github/workflows/*.yml` は Dependabot によって action を
コミットSHA固定 + `# vX.Y.Z` コメント併記の形式で管理している。

## 発覚した問題(PR #96)
- `astral-sh/setup-uv`: SHAは実際には v9.0.0 相当だが、コメントは
  v7.2.0 の頃から更新されず `# v7` のまま長期間ズレていた
  (`git log -p` で辿ると v7.2.0 -> v8.2.0 -> v8.3.2 -> v9.0.0 の全ての
  Dependabot PRでコメントが更新されていなかった)。
- `aws-actions/configure-aws-credentials`: deploy-*.yml 4ファイルでは
  コメントが `# v4` のまま(実際は v6.2.3 相当)。同じSHAを使う
  `pr-ai-review.yml` では正しく `# v6.2.3` と表記されており、
  ファイル間で不整合が生じていた。
- 一方 `actions/checkout` と `actions/setup-python` は毎回正確に
  コメントが更新されている。Dependabotのコメント追従動作は
  action・PRによってブレがあるようで、信用しすぎないこと。

## Why
コメントは人間が実際のバージョンを把握するための唯一の手がかりであり、
ズレていると「マイナー更新だと思ったらメジャーの破壊的変更が
混入していた」といった誤判断を招く。GitHub API
(`GET /repos/{owner}/{repo}/tags`) でSHAから実際のタグ名を逆引きして
検証するのが確実。

## How to apply
- Dependabotの github-actions PRを処理する際は、PR本文中の
  "Updates `X` from A to B" を鵜呑みにせず、diff中のコメントと
  実際のリリースタグが一致しているかを `git log -p --follow` で
  過去のPRを遡るか、GitHub Tags APIで照合する。
- ズレを見つけた場合、そのSHAを変更する行を今回のPRで既に
  触っているなら、ついでにコメントも修正して良い(SHA変更行への
  コメント修正は「今回の更新と無関係なリファクタリング」には
  当たらない)。ただし他のaction(pnpm/action-setup等、今回のPRで
  触っていない行)のズレは対象PRのスコープ外として放置する。

関連: [[setup_uv_v9_prune_cache_default_change]]
