---
name: frontend-lint-fix
description: "フロントエンドのlint/formatを一括実行し、結果を返す。"
user-invokable: true
allowed-tools: Bash, Read
---

# フロントエンド Lint/Format 自動実行

## 概要

`packages/frontend/` に対して `pnpm format` → `pnpm lint` を順次実行し、結果を返します。

## 実行方法

このSKILL.mdと同じディレクトリの `scripts/lint-and-fix.sh` を実行してください。

```bash
bash "<このSKILL.mdのディレクトリ>/scripts/lint-and-fix.sh"
```

スクリプトは `packages/frontend/` をカレントディレクトリとして自動的に設定します。

## 出力

- format による修正内容（修正があった場合）
- lint チェック結果（エラー・警告の一覧）
