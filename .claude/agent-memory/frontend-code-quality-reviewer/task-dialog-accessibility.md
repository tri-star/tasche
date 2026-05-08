---
name: custom task dialogs need focus management review
description: TCH-6 introduced hand-rolled task dialogs instead of Radix/shadcn dialog primitives, so future frontend reviews should verify focus trap, focus return, and live error announcement explicitly.
type: project
---

TCH-6 の `/tasks` 画面では `TaskFormDialog` / `TaskDeleteDialog` が Radix/shadcn の dialog primitive ではなく自前オーバーレイで実装されている。
**Why:** `role="dialog"` と `aria-modal` だけではキーボードフォーカスの閉じ込め、起点へのフォーカス復帰、非同期エラー文言の通知が自動で担保されず、見た目上動いてもアクセシビリティ不備を見逃しやすい。
**How to apply:** 今後この系統の modal 変更をレビューするときは、focus trap、初期フォーカス、close 後の focus return、`aria-live` などの失敗通知を優先確認する。
