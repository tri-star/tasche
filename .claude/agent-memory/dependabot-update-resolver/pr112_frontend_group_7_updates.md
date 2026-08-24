---
name: pr112-frontend-group-7-updates
description: PR #112 (frontend-minor-patchグループ7件、biome/lucide-react/testing-library-user-event/vitejs-plugin-react/orval/vite/vitest)の調査結果
metadata:
  type: project
---

PR #112は `frontend-minor-patch` グループとしてまとめて更新される7件のminor/patch更新（メジャーバージョン変更は含まない）。個別の調査結果は以下の通り、破壊的変更・実害のある非推奨化は確認できなかった。

- **@biomejs/biome 2.5.8→2.5.10**: 2.5.9でAstro/Vue/Svelte向け新規ルール追加(`useNamedLayer`, `useTailwindShorthandClasses`, `useAstroClientOnlyDirectiveValue`, `noUnsafeTypeAssertion`)とCSSパーサ修正、2.5.10でAstroパーサの大幅改善(コメント混在・空expression・fragment省略記法等)。いずれもこのリポジトリでは`linter.rules.recommended: true`のみでnursery個別有効化なし、Astro/Vue/Svelteファイル未使用のため無関係。[[biome_schema_version_mismatch]]の$schema追従のみ実施。
- **lucide-react 1.31.0→1.33.0**: 1.33.0では`list-clock`, `square-dimensions`, `usb-c-port`アイコン追加のみ。`grep -rn "from ['\"]lucide-react['\"]" packages/frontend/src`で確認した使用アイコン(Bell, Check, ChevronDown/Left/Right/Up, ChevronsUpDown, ClipboardList, Home, Loader2, Minus, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Settings, Sparkles, Target, Trash2, User, X)はいずれもリネーム・削除の影響を受けない。
- **@testing-library/user-event 14.6.4→14.6.5**: 「tab retargeting if focus moved during keydown」というバグ修正のみ。破壊的変更なし。
- **@vitejs/plugin-react 6.0.5→6.1.0**: 実験的なReact Compilerサポート(`oxc-transform-react`経由)が追加されたのみで、このリポジトリでは未使用のためオプトイン機能は無関係。vite要求バージョン(`^8.0.0`)に変更なし、既にvite 8系のため[[vitejs_plugin_react_v6_vite8_requirement]]の懸念は該当しない。
- **orval 8.24.0→8.25.0**: リリースノート上は破壊的変更なしだが、「Improved Headers instance merging for fetch clients」というバグ修正により、`openapi:update`実行後の`client.ts`にPOST/PATCH(bodyを持つ)エンドポイントごとに`getHeaders`ヘルパー関数がインライン追加される実質的な差分が発生した(バージョンコメントのみの機械的差分ではないパターン、[[orval_upgrade_notes]]のPR #100と同種)。`options?.headers`がHeadersインスタンス/配列/プレーンオブジェクトいずれの場合でも正しく展開されるようにする改善で、実害・型エラーなし。
- **vite 8.2.1→8.2.2**: `@vitejs/devtools`peer依存範囲の拡大とバグ修正のみ、破壊的変更なし。
- **vitest 4.1.10→4.1.11**: グローバル並行数制限の復元・iframeId エンコード修正・ディスク容量逼迫時のGC・redirect mockのファイルシステム許可リスト強化。破壊的変更なし。

**修正内容**: `pnpm --filter @tasche/frontend openapi:update`を実行して`client.ts`を再生成(1ファイル、80行追加/20行削除、上記getHeadersヘルパー追加が実体)。[[biome_schema_version_mismatch]]の慣例に従い`biome.json`と`packages/frontend/biome.json`の`$schema`を2.5.10に更新。この2つは別コミットにした(本リポジトリの慣例、PR #79, #90, #111と同じ)。

**検証結果**: `pnpm --filter @tasche/frontend lint`(biome check + tsc -b --noEmit、165ファイル、$schema警告解消)、`test`(vitest, 246 test全通過)、`build`(tsc -b && vite build、成功)いずれも成功。E2Eはこのworktree環境(`docker compose up`不可)ではスキップし、CI側で既にSUCCESSだったこと(frontend-openapi以外は全てSUCCESS)から再検証不要と判断([[e2e_local_repro_under_sandbox]]参照)。

**Why**: dependabotのgroup更新PRでは複数パッケージが同時に上がるため、個別に破壊的変更の有無をリリースノートで確認しないと見落としが起きる。orvalのpatch更新は「バージョンコメントのみの機械的差分」という思い込みで済ませず、実際の差分内容(getHeadersヘルパー追加のような実質的コード生成ロジック変更)を毎回確認する必要がある。

**How to apply**: 同様の`*-minor-patch`グループPRでは、まず`git diff main..<branch> -- package.json packages/frontend/package.json`で更新一覧を出し、各パッケージについて個別にWebFetchでGitHub Releases/CHANGELOGを確認する。orvalが含まれる場合は[[orval_upgrade_notes]]のパターンをまず疑いつつ、`openapi:update`実行後は必ず`git diff --stat`で差分行数を確認し「1行×全ファイル」以外のパターン(今回のようなヘルパー関数追加)が出ていないか目視で中身を確認する。biomeが含まれる場合は[[biome_schema_version_mismatch]]の$schema追従を忘れない。
