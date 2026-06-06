---
name: checkbox-double-handler-antipattern
description: button要素内にCheckbox(onCheckedChange)を同居させるとダブルトグルが発生する。TCH-65で発見。
metadata:
  type: feedback
---

Radix Checkbox を `<button onClick={onToggle}>` の内側に置き、両方に `onToggle` を紐付けると、クリック時に `onCheckedChange` と button の `onClick` の二重発火でトグルがキャンセルアウトされる。

**Why:** `onClick={(e) => e.stopPropagation()}` を Checkbox に付与しても、Radix の内部 composedPath 処理とバブリングの順序によって確実には防げない。

**How to apply:** TaskItem のような「チェックボックス付きカード」コンポーネントをレビューする際は、外側 button と Checkbox の onCheckedChange が競合していないか必ず確認する。toggle の責務はどちらか一方に一本化する。

関連: [[aria-label-missing-in-table-inputs]]
