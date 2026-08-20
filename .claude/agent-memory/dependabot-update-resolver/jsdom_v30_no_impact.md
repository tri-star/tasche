---
name: jsdom-v30-no-impact
description: jsdom 29→30メジャー更新は修正不要。Node要件引き上げのみが主な破壊的変更で、frontendのNodeバージョン(24.x)は満たす
metadata:
  type: project
---

jsdom 29.1.1 → 30.0.1（PR #107）はコード修正不要と判断した。

## 調査結果
- jsdom 30.0.0 の唯一の breaking change は Node.js 最小バージョンの引き上げ
  （`^22.22.2 || ^24.15.0 || >=26.0.0`）。`node_modules/jsdom/package.json` の
  `engines` フィールドで確認済み。
- 30.0.0 の getComputedStyle()/calc() 周りの回帰が 30.0.1 で修正されており、
  PRは最初から30.0.1（回帰修正済み版）を指しているため実害なし。
- CSS.escape()/CSS.supports() 追加、background-position-x/y 追加、
  getComputedStyle() のpx変換修正など、いずれも新機能追加・バグ修正であり
  既存APIの削除・破壊的変更ではない。
- CVEなし。セキュリティ起因の更新ではない（通常のメジャーバンプ）。
- リポジトリ内で `jsdom` を直接import/操作しているコードは無し。
  `vitest.config.ts` の `environment: "jsdom"` と `src/test/setup.ts` の
  DOM APIスタブ（scrollIntoView, hasPointerCapture, ResizeObserver,
  HTMLDialogElement.showModal/close）のみが利用箇所で、jsdom 30でも
  引き続き未実装のため既存スタブがそのまま必要。

## Node要件について
- jsdom 30 は Node `^24.15.0` を要求するが、frontend-ci.yml は
  `node-version: 24.x`（actions/setup-node）を使うため、CI実行時は
  常に最新の24系が使われ要件を満たす。
- ローカル検証環境（mise管理、Node v24.1.0）は要件を満たさないが、
  pnpmはデフォルトで`engines`を強制しない（`engine-strict`未設定、
  pnpm-workspace.yamlにもengine関連設定なし）ため、`pnpm install`は
  警告なしで成功し、`pnpm test`/`lint`/`build`も問題なく通った
  （246 test / lint / build 全て成功、PR #107で確認）。
- ローカルNodeが古い場合でも動作に支障はなかったが、将来的にjsdomが
  実際にNode 24.15+固有APIに依存し始めた場合は要注意。

## 関連
- [[jest_dom_v7_no_impact]]（同時期のフロントエンドdevDependency更新、同様に無修正で通過）
