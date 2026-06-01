---
name: sprite-accessibility
description: TCH-64: backgroundImage スプライトを使うコンポーネントは aria-hidden="true" か role="img"+aria-label が必須。隣接テキストで情報が補完されていても明示が必要。
metadata:
  type: feedback
---

スプライト画像（CSS backgroundImage で描画）は div に対してスクリーンリーダーが完全に無視する。

隣接する数値テキスト（rate%）が存在する場合でも、アイコンが装飾であることを明示するために `aria-hidden="true"` を付与するか、意味を伝えたい場合は `role="img"` + `aria-label` を使う。

**Why:** WeeklyMatrix の ProgressSprite（TCH-64）でこの欠落を確認。`aria-label="週間達成状況"` でセクションをセマンティクス化しているにもかかわらず、内部のアイコンが不透明になっていた。

**How to apply:** `<div style={{ backgroundImage: ... }}>` パターンを見たら必ず aria-hidden または role="img" の付与を確認する。
