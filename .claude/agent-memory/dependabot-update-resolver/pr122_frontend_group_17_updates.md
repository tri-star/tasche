---
name: pr122-frontend-group-17-updates
description: PR #122 (frontend-minor-patchグループ17件、biome/react-query/lucide-react/oauth4webapi/react/react-router-dom/tailwind-merge/playwright/jsdom/orval/postcss/vite等)の調査結果
metadata:
  type: project
---

PR #122は `frontend-minor-patch` グループとしてまとめて更新される17件のminor/patch更新（メジャーバージョン変更は含まない）。個別の調査結果は以下の通り。

- **orval 8.26.0→8.34.0**: [[orval_upgrade_notes]]参照。8.28.1の「de-inline mocks by default in single and tags modes」という破壊的変更で `client.msw.ts` が新規生成されるようになり、既存の`src/mocks/handlers/generated.ts`（client.tsのexportをscanしてMockHandlerを収集する実装）が機能しなくなる問題があった。`orval.config.ts`の`mock`に`inline: true`を追加して対応。加えて8.34.0時点でも`client.ts`のgetHeaders()ヘルパーがさらに堅牢化される実質差分あり（Headers以外の一般Iterableにも対応、実害なし）。
- **@playwright/test 1.62.1→1.63.0**: [[playwright_version_docker_image_pin]]参照。`.github/workflows/frontend-ci.yml`のDockerイメージタグを`v1.63.0-noble`に追従。ローカルで実際に対応するchromiumビルド(1243)をインストールしE2E一式を実行し成功を確認（詳細は[[e2e_local_repro_under_sandbox]]の追記参照）。
- **@biomejs/biome 2.5.11→2.5.14**: [[biome_schema_version_mismatch]]の$schema追従のみ必要。2.5.14で新規nurseryルール`noReturnInFinally`追加のみ、recommended:trueのみのこのリポジトリには影響なし。
- **tailwind-merge 3.3.1→3.7.0**: 公式リリースノート確認、破壊的変更なし。3.6.0で`postfixLookupClassGroups`オプション追加、3.7.0で`fromTheme`に`themeKey`プロパティ追加（いずれも新機能追加）。クラス分類のバグ修正が複数あるが、いずれも既存動作を壊す変更ではない。
- **@tanstack/react-query 5.102.8→5.103.1, react 19.2.8→19.3.0, react-dom 19.2.8→19.3.0, react-router-dom 7.18.3→7.18.4, oauth4webapi 3.8.7→3.8.8, @testing-library/user-event 14.6.6→14.6.7, @types/node 26.4.0→26.6.2, @types/react 19.2.18→19.3.0, @types/react-dom 19.2.5→19.3.0, jsdom 30.0.1→30.1.0, postcss 8.5.26→8.5.28, vite 8.2.2→8.3.0**: いずれも同一メジャー内のminor/patch更新で、公式リリースノート上も破壊的変更の記載なし（React 19.3.0はView Transitions等の新機能追加のみ、Vite 8.3.0はビルド最適化のみ）。
- **lucide-react 1.35.0→1.47.0**: 新規アイコン追加が主。このリポジトリで使用中のアイコン（X, Sparkles, ClipboardList, Home, Settings, Target, User, Loader2, Plus, RefreshCw, Check, Minus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Search, Bell, Pencil, Trash2, ChevronsUpDown）のリネーム・削除は確認されず。lint/test/buildで実際にimportエラーも発生しなかった。

**修正内容**:
1. `packages/frontend/orval.config.ts`に`mock.inline: true`を追加し、`pnpm openapi:update`で`client.ts`を再生成（client.msw.tsは生成されないことを確認）。
2. `biome.json` / `packages/frontend/biome.json`の`$schema`を2.5.14に更新。
3. `.github/workflows/frontend-ci.yml`のPlaywright Dockerイメージタグを`v1.62.1-noble`→`v1.63.0-noble`に更新。

**検証結果**: `pnpm --filter @tasche/frontend lint`（biome check 165 files + tsc -b --noEmit、info診断なし）、`test`（vitest, 246 test全通過）、`build`（tsc -b && vite build、成功）いずれも成功。E2Eは[[e2e_local_repro_under_sandbox]]の手順（`dangerouslyDisableSandbox`使用）で実際に実行し、20 passed / 2 flaky（該当specファイル単体では3件とも安定して成功、並列実行時のリソース競合が原因と判断）/ 7 skippedで機能面の問題なしを確認。

**Why**: orvalのようにデフォルト挙動が変わるメジャー機能変更（`!`付きcommit）は、CI失敗ログの表面的な差分（新規ファイル生成）だけでなく、そのファイルを消費する側のコード（今回は`generated.ts`のスキャン実装）への影響を必ず確認する必要がある。単に生成物をコミットするだけでは既存のMSWモック機能が静かに壊れていた可能性がある。

**How to apply**: 同様の`*-minor-patch`グループPRでは、まず`git diff main..<branch> -- package.json packages/frontend/package.json`で更新一覧を出し、各パッケージについて個別にWebFetch/WebSearchでGitHub Releasesを確認する。orvalが含まれる場合は[[orval_upgrade_notes]]、biomeが含まれる場合は[[biome_schema_version_mismatch]]、@playwright/testが含まれる場合は[[playwright_version_docker_image_pin]]をまず確認する。
