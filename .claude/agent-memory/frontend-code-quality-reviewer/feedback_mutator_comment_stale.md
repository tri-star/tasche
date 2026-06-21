---
name: orval-mutator-comment-stale
description: TCH-75: authFetch.ts（orval mutator）のJSDocが旧実装（Authorization/リトライ）を説明したまま残っていた。mutatorのコメントは認証方式変更時に更新漏れが起きやすい。
metadata:
  type: feedback
---

`src/auth/authFetch.ts` は全 API 呼び出しの中継点であるため、コメントに誤った認証仕様（Authorization ヘッダ付与・401 自動リトライ）が残ると後続開発者への誤解リスクが非常に高い。

**Why:** orval の mutator は自動生成対象外（手書き）であるため、認証方式の刷新時に実装は更新されてもコメントが取り残されやすい。

**How to apply:** 認証方式の変更レビュー時は `authFetch.ts` のコメントが実装と一致しているか必ず確認する。Critical として扱う。
