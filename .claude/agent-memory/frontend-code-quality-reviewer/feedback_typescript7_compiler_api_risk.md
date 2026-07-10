---
name: feedback_typescript7_compiler_api_risk
description: TCH-96でtypescriptを7.0.2へ完全固定。TS7.0 GAはプログラマティックAPIを同梱しない仕様のため、orval等のツールが壊れるリスクがある。
metadata:
  type: project
---

TCH-96（コミット c9d7ac6, 6abcb5b）で `packages/frontend/package.json` の `typescript` を `~5.9.3` → `7.0.2`（キャレット/チルダなしの完全固定）に変更。同時に `tsconfig.app.json` から `baseUrl` を削除し `paths` の `@/*` を `./src/*` へ相対パス化（TS7で `baseUrl` 単体指定がハードエラーになるため必須の追従）。

**Why:** TypeScript 7.0 は Microsoft の Go移植版で、2026年7月に正式GAしたが、**プログラマティックAPI（`ts.factory`, `ts.createProgram` 等）を同梱していない**（7.1で提供予定とアナウンスされている）。これにより ts-node, ts-jest, typescript-eslint/parser, typedoc, ts-morph ベースのツールなど「`typescript` パッケージをライブラリとしてrequireするツール」が軒並み動作しなくなる既知の業界問題がある。

このリポジトリの `pnpm-lock.yaml` でも実際に、`orval@8.20.0` の実行時 `dependencies`（optionalではない）に `typedoc@0.28.19` が含まれ、その `peerDependencies` は `typescript: 5.0.x || ... || 6.0.x` と明記されており `7.0.2` は範囲外（=lockfile上で解決不能な組み合わせが強制されている）。`pnpm install` は既定でpeer不一致を警告のみで通す（`.npmrc` に `strict-peer-dependencies` なし）ため、インストール自体は成功して問題が隠れる可能性がある。

このプロジェクトには `.github/workflows/frontend-ci.yml` の `frontend-openapi` ジョブがあり、`pnpm --filter @tasche/frontend openapi:update`（orvalによるAPIクライアント生成）を実行し、生成物の差分があればCI失敗させる仕組みがある。TS7でorval内部のAPI依存コードが壊れていれば、このジョブで実行時エラーとして顕在化するはず。

**How to apply:** 今後 `typescript` のバージョン変更（特にメジャー）が絡むPRをレビューする際は、
1. `pnpm-lock.yaml` で `typescript@<version>` を requireしている `devDependencies` (orval, typedoc, vitest, msw等) の `peerDependencies` 範囲を grep で確認する。
2. `frontend-openapi` / `frontend-lint` / `frontend-build` のCIジョブが実際にグリーンかどうかを確認する（ローカルのファイル読み取りだけでは判断できないため、CI結果の確認をレビューコメントで明示的に求める）。
3. Microsoft公式が出している互換パッケージ `@typescript/typescript6`（`tsc6` 実行ファイル、TS6 APIを再エクスポート）で codegen 系ツールだけ旧APIに固定する回避策があることを提案候補として持っておく。
4. `package.json` でバージョン指定がキャレット/チルダなしの完全固定になっている場合、それが意図的な「破壊的メジャーへの追従を防ぐガード」なのか単なるミスなのかを確認する。今回は正しく完全固定されていたが、その意図を示すコメントやドキュメントがリポジトリ内に見当たらなかった。

関連: [[feedback_mutator_comment_stale]]（依存関係・設定変更時にコメント/ドキュメントが陳腐化・欠落しやすいという同系統の指摘）
