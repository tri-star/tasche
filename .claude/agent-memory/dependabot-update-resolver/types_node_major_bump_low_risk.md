---
name: types-node-major-bump-low-risk
description: "@types/nodeのメジャーバージョンアップ(例: 24→26)はfrontendでbuild toolingのみに使う限り実質無害"
metadata:
  type: project
---

`@types/node` はNode.js本体のバージョンとは独立してメジャーバージョンが上がる(DefinitelyTypedはNode.jsの各メジャーに追従するがsemverpoliyには従わない)。PR #88 (24.13.2→26.1.1) で確認したところ:

- Node.js 26のリリースノート上の破壊的変更(DEP0182のcrypto関連削除、`http.Server.prototype.writeHeader()`削除、legacy `_stream_*` 内部モジュール削除など)は、いずれもfrontendコードが直接使っていないAPI・内部実装向けのもので影響なし。
- CIのNode.js実行バージョンは24.x(LTS)だが、型定義だけ26系を使う状態(型が実行環境より新しい)は一般的に問題ない。型は基本的に後方互換であり、Node 26だけの新APIをコードが使わない限り実行時エラーにはならない。逆に型定義が実行環境より古いケースの方が「実行時に存在するAPIの型がない」問題が起きやすい。
- 実際に `tsc -b --noEmit` (lintに含まれる) / vitest / vite build のいずれでもエラーは出なかった。

**Why:** dependabotが@types/nodeのメジャー更新PRを作るたびに、Node.js本体アップグレードと誤解して過剰に警戒しないようにするため。
**How to apply:** @types/nodeのメジャー更新PRでは、まずリポジトリがNode組み込みAPI(fs/path/process/Buffer等)を直接・広範に使っているか確認する。frontendのようにvite/vitestなどのbuild toolingでしか使わない場合は、typecheck/lint/test/buildが通れば追加調査は最小限でよい。backend(Python)側とは無関係。
