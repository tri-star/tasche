---
name: bootstrap-hook-test-coverage
description: TCH-75: useBootstrapAuthのユニットテストが存在しなかった。起動時セッション復元hookは非200エラーの分岐・StrictMode抑制のテストが必要。
metadata:
  type: feedback
---

アプリ起動時に一度だけ呼ばれる hook（`useBootstrapAuth` など）は、MSW 統合テストや E2E で間接カバーされていても、以下ケースがユニットテストで明示されていないことが多い：

- `/api/users/me` が 401 以外（500等）のエラーを返した場合の authStatus
- 設定 API 失敗時に authenticated が継続することの確認
- `useRef` による StrictMode 二重呼び出し抑制の動作

**Why:** 起動時のセッション復元ロジックはアプリ全体に影響するが、テスト対象として見落とされやすい。

**How to apply:** 「アプリ起動時に一度だけ呼ばれる初期化 hook」を見たらユニットテストの有無を確認し、なければ Warning として指摘する。
