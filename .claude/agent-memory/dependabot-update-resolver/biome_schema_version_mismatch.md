---
name: biome-schema-version-mismatch
description: "@biomejs/biomeを更新すると biome.json の $schema バージョンとCLIバージョンの不一致でinfo診断が出る（lint自体は失敗しない）"
metadata:
  type: project
---

`biome.json`（リポジトリルートと `packages/frontend/biome.json` の両方）は `$schema` フィールドで `https://biomejs.dev/schemas/<version>/schema.json` を指定している。`@biomejs/biome` をバージョンアップすると、この `$schema` に埋め込まれたバージョン番号が古いままになり、`biome check` 実行時に

```
i The configuration schema version does not match the CLI version <new>
  Expected: <new>
  Found: <old>
  Run the command biome migrate to migrate the configuration file.
```

という info 診断が出る（PR #79で2.5.1→2.5.2の際に確認、PR #90で2.5.2→2.5.3の際にも再現）。

**Why:** これは `Found 1 info.` として表示されるだけで `pnpm --filter @tasche/frontend lint` の終了コードは0のまま（テスト・CIは落ちない）。ただし放置すると新しいCLIバージョンのスキーマ機能を認識できない・診断が汚れる、という理由でbiome公式は`biome migrate`での追従を推奨している。

**How to apply:** `@biomejs/biome` の更新PRを扱う際は、`biome.json` / `packages/frontend/biome.json` 内の `$schema` のバージョン番号を新バージョンに手動で置換する（単純な文字列置換で十分、`biome migrate` コマンドを使わなくても対応可能）。CIの必須チェックには影響しないため、修正しなくてもマージ自体は可能だが、今回のアップデートで生じた警告なので合わせて直すのが望ましい。
