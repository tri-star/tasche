---
name: weekly-matrix-color-tokens
description: WeeklyMatrixのgetCompletionColorClassが固定カラー(red/yellow/green)を使い続けており、ダークモード対応は完了しているがセマンティックトークン化は未完。
metadata:
  type: feedback
---

`WeeklyMatrix.tsx` の `getCompletionColorClass()` は `bg-red-200 dark:bg-red-900/50` のような固定カラーで段階的な達成率を色分けしている。

**Why:** 達成率に応じた5段階のグラデーションは `destructive-soft`/`warning-soft`/`success-soft` の3トークンでは表現しきれないため、完全なトークン化は追加トークン定義が必要。ただし現状は `dark:` 修飾子が付いており最低限のダークモード対応はできている。

**How to apply:** 将来 WeeklyMatrix の色変更をレビューするとき、固定カラー使用を指摘するか、新しい段階的グラデーション用トークン（`--completion-low`, `--completion-mid` 等）の追加を提案する。
