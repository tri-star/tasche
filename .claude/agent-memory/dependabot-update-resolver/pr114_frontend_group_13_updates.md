---
name: pr114-frontend-group-13-updates
description: PR #114 (frontend-minor-patchグループ13件、biome/react-query/jotai/lucide-react/react-router-dom/testing-library系/types-node/vitejs-plugin-react/orval/vite/vitest) の調査結果
metadata:
  type: project
---

PR #114は `frontend-minor-patch` グループとしてまとめて更新される13件のminor/patch更新（メジャーバージョン変更は含まない）。個別の調査結果は以下の通り、いずれも破壊的変更・実害のある非推奨化は確認できなかった。

- **@biomejs/biome 2.5.8→2.5.11**: [[biome_schema_version_mismatch]]の$schema追従のみ必要。lint自体は元々失敗しない。
- **orval 8.24.0→8.26.0**: [[orval_upgrade_notes]]参照。「spread Headers instance correctly when merging custom headers」の実質的な差分あり（client.tsのみ、バージョンコメントではない）。呼び出し元がoptions.headersを使っていないため実害なし。
- **lucide-react 1.31.0→1.35.0**: 1.32〜1.35はいずれも新規アイコン追加のみ（car-battery, list-clock, square-dimensions, usb-c-port, audio-lines-off, mop, midi-port, mail-clock, ship-cargo, trailer, galaxy, bat, robot-arm）とghostアイコンのデザイン修正、equal-approximatelyのtypo修正のみ。リネーム・削除・非推奨化はなし。このリポジトリで使用中の`X, Sparkles, ClipboardList, Home, Settings, Target, User, Loader2, Plus, RefreshCw, Check, Minus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Search, Bell, Pencil, Trash2, ChevronsUpDown`はいずれも影響なし。
- **@vitejs/plugin-react 6.0.5→6.1.1**: 6.1.0でReact Compiler対応(experimental, `compiler`オプション)が追加されたのみ。peerDependenciesのvite要求バージョンに変更なし（[[vitejs_plugin_react_v6_vite8_requirement]]の通りvite^8.0.0要求は既に満たしている）。破壊的変更なし。
- **@tanstack/react-query 5.101.4→5.102.8**: パッチ主体のリリースで破壊的変更の記載なし。
- **jotai 2.20.2→2.20.3, react-router-dom 7.18.2→7.18.3, @testing-library/react 16.3.2→16.3.3, @testing-library/user-event 14.6.4→14.6.6, @types/node 26.2.0→26.4.0, @types/react-dom 19.2.4→19.2.5, vite 8.2.1→8.2.2, vitest 4.1.10→4.1.11**: いずれもpatch更新で、破壊的変更の記載なし。テスト全通過で実害なしを確認。

**修正内容**: [[orval_upgrade_notes]]の既知パターンに従い`pnpm --filter @tasche/frontend openapi:update`を実行して`src/api/generated/client.ts`を再生成（今回は61ファイル中client.tsのみ、80行の実質差分）。加えて[[biome_schema_version_mismatch]]の慣例に従い`biome.json`と`packages/frontend/biome.json`の`$schema`を2.5.11に更新。この2つは別コミットにした（本リポジトリの慣例、コミットハッシュ d4b2197 / a1d2ae1）。

**検証結果**: `pnpm --filter @tasche/frontend lint`（biome check 165 files + tsc -b --noEmit）、`test`（vitest, 246 test全通過）、`build`（tsc -b && vite build）いずれも成功。typecheck専用scriptは存在せず、lintに`tsc -b --noEmit`が含まれる構成（PR #111時点と変化なし）。E2Eはこのworktree環境では未実行、CI側の確認に委ねた。

**Why**: dependabotのgroup更新PRでは複数パッケージが同時に上がるため、個別に破壊的変更の有無をリリースノートで確認しないと見落としが起きる。特にorvalは今回のようにpatch更新でも生成コードに実質的な差分（バージョンコメントだけでない）が出ることがあるため、`git diff --stat`で差分の中身を都度確認する必要がある。

**How to apply**: 同様の`*-minor-patch`グループPRでは、まず`git diff main..<branch> -- package.json packages/frontend/package.json`で更新一覧を出し、各パッケージについて個別にWebFetch/WebSearchでGitHub Releasesを確認する。orvalが含まれる場合は[[orval_upgrade_notes]]のパターンをまず疑い、biomeが含まれる場合は[[biome_schema_version_mismatch]]の$schema追従を忘れない。lucide-reactのようなアイコンライブラリはリネーム・削除がないか公式リリースノートを都度確認すること（importエラーになるので気づきやすいが念のため）。
