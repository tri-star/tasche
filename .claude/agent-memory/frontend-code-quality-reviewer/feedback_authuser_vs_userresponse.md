---
name: authuser-vs-userresponse-type-divergence
description: TCH-75: 手書きのAuthUser型とorval生成UserResponseの間でフィールドのoptional性が乖離しやすい。auth関連レビュー時に必ず比較する。
metadata:
  type: feedback
---

TCH-75 で確認されたパターン: `src/auth/types.ts` の `AuthUser` と orval 生成の `UserResponse` で `timezone` および `picture` の optional 性が乖離していた。

- `UserResponse.timezone` → `string`（必須）
- `AuthUser.timezone` → `string | undefined`（optional）
- `UserResponse.picture` → `string | null`（non-optional nullable）
- `AuthUser.picture` → `string | null | undefined`（optional + nullable）

**Why:** `AuthUser` は orval 生成型より前から存在しており、型を揃え直す機会が取られていなかった。API レスポンスの shape を手動で再定義した型には必ずこの乖離が生まれやすい。

**How to apply:** auth 関連コードをレビューする際、`AuthUser`（または類似の手書き型）と `UserResponse`（orval 生成）のフィールドを必ず並べて比較する。乖離があれば型の統合または `UserResponse` 直接利用を提案する（Critical 扱い）。

関連: [[orval-generated-types-reuse]]
