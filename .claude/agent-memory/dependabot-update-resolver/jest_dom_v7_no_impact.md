---
name: jest-dom-v7-no-impact
description: "@testing-library/jest-dom 6.9.1→7.0.0メジャー更新は修正不要と判断した根拠(PR #108)"
metadata:
  type: project
---

`@testing-library/jest-dom` 6.9.1 → 7.0.0 (PR #108) はメジャー更新だが、このリポジトリのfrontendは無修正でマージ可能と判断した。

## v7.0.0の破壊的変更（GitHub Releaseより）
- `@testing-library/dom` が任意→必須のpeer dependencyに変更（`>=10 <11`）
- サポートするNode.jsの最低バージョンが `>=14` → `>=22` に引き上げ
- エントリポイント（`@testing-library/jest-dom/vitest` 等）自体の変更なし
- 既存の非推奨matcher（`toBeEmpty` / `toBeInTheDOM` / `toHaveDescription`）はv7で新規に非推奨化されたものではなく、以前から非推奨（このリポジトリでは未使用）

## このリポジトリへの影響評価
- `packages/frontend/src/test/setup.ts` は元々 `@testing-library/jest-dom/vitest` をimportしており変更不要
- Node要件: 全frontend CI workflow（`frontend-ci.yml`等）はNode 22/24系を使用、ローカル検証環境もNode 24.1.0 → `>=22` 要件を満たす
- peer dependency要件: `@testing-library/react@16.3.1` 経由で既に `@testing-library/dom@10.4.1` が解決済み → 追加インストール不要（pnpm-lock.yamlの差分でもjest-domのバージョン欄が `10.4.1` にひも付いているのみで新規パッケージ追加なし）

## 実施した確認
- `pnpm install --frozen-lockfile`
- `pnpm --filter @tasche/frontend lint`（biome + tsc --noEmit）→ 成功
- `pnpm --filter @tasche/frontend test`（vitest run）→ 36 test files / 246 tests 全通過
- `pnpm --filter @tasche/frontend build` → 成功（既存の警告のみ、jest-domと無関係）

## 教訓
jest-dom等testing-library系のメジャー更新では、まず「Node最低バージョン要求」と「`@testing-library/dom` peer要件」の2点をリリースノートで確認すればよい。既にreact/dom周りのtesting-libraryを使っている場合、peer要件は大抵既存の依存で自動的に満たされる。

関連: [[types_node_major_bump_low_risk]]（ビルドツール系のメジャー更新が低リスクという判断パターン）
