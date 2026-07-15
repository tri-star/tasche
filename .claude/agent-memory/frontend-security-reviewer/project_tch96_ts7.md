---
name: project_tch96_ts7
description: TCH-96 TypeScript v7移行のセキュリティレビューで確認したTS7ネイティブバイナリ配布形態とサプライチェーンガードの整合性
type: project
---

TCH-96でtypescriptを`~5.9.3`から`7.0.2`（完全固定）にアップデート（commit c9d7ac6）。TS7はGoで書き直されたネイティブコンパイラで、プラットフォーム別バイナリが`@typescript/typescript-<os>-<arch>@7.0.2`という新規スコープパッケージ群としてoptionalDependenciesに追加された（esbuild/rolldown等と同様のパターン）。

レビュー時に確認した事実（2026-07-11時点）:
- npm registry上で`typescript@7.0.2`と`@typescript/typescript-linux-x64@7.0.2`等のmaintainersは`typescript-bot`/`microsoft1es`等、公式TypeScriptチームと一致。integrity hashもpnpm-lock.yaml記載値と一致し、typosquat/namespace乗っ取りの兆候なし。
- これらのネイティブバイナリパッケージにpostinstall等のインストールスクリプトは存在せず（`npm view <pkg> scripts`が空、pnpm-lock.yaml中に`requiresBuild`フラグが一件もない）。そのためpnpm-workspace.yamlの`allowBuilds`（esbuild, mswのみ許可）への追加は不要と判断。この構造が変わった場合（将来TS7がpostinstallでバイナリ取得等に変更された場合）は要再確認。
- `pnpm-workspace.yaml`の`minimumReleaseAge: 2880`（2日）ガードとの整合性: typescript@7.0.2のnpm公開は2026-07-08T15:55、コミット日時は2026-07-11T00:19で約2.4日経過しており、ガードに抵触せず正しく運用されている。
- 全CIワークフロー（frontend-ci.yml, deploy-frontend-*.yml, reusable-node-pnpm-run.yml）で`pnpm install --frozen-lockfile`を使用しており、lockfile改ざん・未反映の依存追従を防ぐ構造になっている。

**Why:** メジャーバージョン2つ跨ぎの依存更新はサプライチェーンリスク（配布形態変更、パッケージ名の出所詐称）を評価する必要があった。
**How to apply:** 今後同様の「ネイティブバイナリ配布に切り替わったツール」の依存更新（例: 他のGo/Rust製JSツールの移行）をレビューする際は、同じ手順（`npm view <pkg> maintainers/scripts`でintegrity・publisher・install scriptの有無を確認、`minimumReleaseAge`との日数整合を確認）を踏襲する。tsconfig.app.jsonの`baseUrl`削除・`paths`相対パス化はTS7の言語仕様変更に伴う対応でセキュリティ上の懸念なし。
