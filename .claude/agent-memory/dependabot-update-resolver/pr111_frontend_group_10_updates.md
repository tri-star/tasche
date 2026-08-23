---
name: pr111-frontend-group-10-updates
description: PR #111 (frontend-minor-patchグループ10件、biome/lucide-react/oauth4webapi/faker/jest-dom/user-event/@types-node/orval/postcss/vite) の調査結果
metadata:
  type: project
---

PR #111は `frontend-minor-patch` グループとしてまとめて更新される10件のminor/patch更新（メジャーバージョン変更は含まない）。個別の調査結果は以下の通り、いずれも破壊的変更・実害のある非推奨化は確認できなかった。

- **@biomejs/biome 2.5.6→2.5.8**: 2.5.7で`noExtendNative`等の新規nurseryルール追加、2.5.8で`useReactCompiler`等の新規nurseryルール追加。このリポジトリの`biome.json`は`linter.rules.recommended: true`のみでnurseryルールを個別有効化していないため影響なし。[[biome_schema_version_mismatch]]の$schema追従のみ必要。
- **lucide-react 1.28.0→1.31.0**: 1.30.0で「Refine & rename various emoji icons」とあり絵文字系アイコンの名称変更があった可能性があるが、`grep -rn "from ['\"]lucide-react['\"]" packages/frontend/src` で確認したところ使用アイコンは `X, Sparkles, ClipboardList, Home, Settings, Target, User, Loader2, Plus, RefreshCw, Check, Minus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Search, Bell, Pencil, Trash2, ChevronsUpDown` のみで絵文字系アイコンは未使用。影響なし。
- **orval 8.23.0→8.24.0**: 「Drop version from default generated header」の影響で生成ヘッダーのバージョン表記が消えたため`frontend-openapi`ジョブが失敗（既知パターン、詳細は[[orval_upgrade_notes]]参照）。API定義側の破壊的変更はなし。
- **vite 8.2.0→8.2.1**: patchリリース。build/lint/testいずれも影響なし。
- **oauth4webapi 3.8.5→3.8.7, @faker-js/faker 10.5.0→10.6.0, @testing-library/jest-dom 7.0.0→7.0.1, @testing-library/user-event 14.6.1→14.6.4, @types/node 26.1.2→26.2.0, postcss 8.5.25→8.5.26**: いずれもpatch更新で、リリースノート上も破壊的変更の記載なし。テスト全通過で実害なしを確認。

**修正内容**: [[orval_upgrade_notes]]の既知パターンに従い`pnpm --filter @tasche/frontend openapi:update`を実行して`src/api/generated/**`を再生成（61ファイル、各1行のヘッダー差分のみ）。加えて[[biome_schema_version_mismatch]]の慣例に従い`biome.json`と`packages/frontend/biome.json`の`$schema`を2.5.8に更新。この2つは別コミットにした（本リポジトリの慣例）。

**検証結果**: `pnpm --filter @tasche/frontend lint`（biome check + tsc -b --noEmit）、`test`（vitest, 246 test全通過）、`build`（tsc -b && vite build）いずれも成功。E2Eはこのworktree環境（`docker compose up`不可）ではスキップし、CI側で既にSUCCESSだったこと（frontend-openapi以外は全てSUCCESS）から再検証不要と判断（[[e2e_local_repro_under_sandbox]]参照）。

**Why**: dependabotのgroup更新PRでは複数パッケージが同時に上がるため、個別に破壊的変更の有無をリリースノートで確認しないと見落としが起きる。特にlucide-reactのようなアイコンライブラリはリネーム・削除がコード上サイレントに壊れる（importエラーになるので気づきやすいが念のため）。

**How to apply**: 同様の`*-minor-patch`グループPRでは、まず`git diff main..<branch> -- package.json packages/frontend/package.json`で更新一覧を出し、各パッケージについて個別にWebFetchでGitHub Releasesを確認する。orvalが含まれる場合は[[orval_upgrade_notes]]のパターンをまず疑い、biomeが含まれる場合は[[biome_schema_version_mismatch]]の$schema追従を忘れない。
