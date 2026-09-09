---
name: vitest-v5-no-impact
description: vitest 4.1.11→5.0.0メジャー更新は修正不要と判断した根拠(PR #118)
metadata:
  type: project
---

vitest 5.0.0 の主な破壊的変更(clearMocksデフォルトtrue化、vi.mock/vi.hoistedのトップレベル外呼び出しでのエラー化、test.sequential廃止、expect.pollのタイムアウト時fail化、async assertion未awaitのfail化、toHaveTextContentの厳格化、config探索が親ディレクトリに及ばなくなった点、attachmentsDir変更)を確認したが、このリポジトリ(`packages/frontend`)はいずれにも該当しなかった。

判断根拠:
- `vitest.config.ts`/`vite.config.ts`はプロジェクトルート直下にあり、config探索の変更の影響を受けない。
- `test.sequential`/`describe.sequential`は未使用。
- `vi.mock`/`vi.hoisted`はすべてトップレベルで呼ばれている(インデント付き呼び出しなし)。
- `clearMocks`はconfig/setup.tsどちらにも明示設定されておらず、デフォルトtrue化の影響を受けるが、各テストの`afterEach`でMSWハンドラリセットとauthユーザーリセットのみ行っており、mockの呼び出し履歴に依存するアサーションパターンは見当たらない。
- `toHaveTextContent`使用箇所(Sidebar.test.tsx, TasksPage.test.tsx, TimezoneCombobox.test.tsx)はいずれも単純な部分一致文字列で、厳格化の影響なし。
- Node要件(>=22.12.0)・Vite要件(>=6.4.0)は、CIがnode 24.x・viteが既に^8.2.2のため満たしている。
- `@vitest/coverage-*`・`@vitest/ui`はdevDependenciesに存在せず、バージョン不整合の懸念なし。

pnpm install / lint(biome+tsc) / test(246 test全通過) / build いずれも無修正で成功した。

**Why**: メジャーバージョンアップでも、config構造・テストコードの書き方次第では実質的な影響がないケースがある。関連: [[pr114_frontend_group_13_updates]]

**How to apply**: 今後vitestやその周辺パッケージ(@vitest/*)がバージョンアップするDependabot PRでは、まず`vi.mock`/`vi.hoisted`のトップレベル呼び出し徹底、`clearMocks`関連設定の有無、`toHaveTextContent`等の厳格化対象マッチャー使用箇所を優先的にgrepで洗い出すと調査が早い。
