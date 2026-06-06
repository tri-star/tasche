---
name: aria-label-missing-in-table-inputs
description: テーブルセル内の number input は aria-label が欠落しやすい。TCH-65で発見。
metadata:
  type: feedback
---

週次テーブル（WeeklyTargetGrid 等）のセル内 `<input type="number">` は、`<th>` 見出しが近くにあっても aria-label / aria-labelledby が明示されていないとスクリーンリーダーが匿名フィールドとして読み上げる。

**Why:** テーブルの行見出し・列見出しはスクリーンリーダーがセルと自動的に関連付けるわけではなく、input 要素のラベルとしては機能しない。

**How to apply:** N行×M列テーブル内に入力欄があるコンポーネントをレビューするとき、各 input に `aria-label="${task.name}の${dayLabel}曜日の..."` 形式が付いているか確認する。

関連: [[checkbox-double-handler-antipattern]]
