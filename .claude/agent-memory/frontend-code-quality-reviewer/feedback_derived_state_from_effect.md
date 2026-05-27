---
name: derived-state-from-effect
description: useEffect内でsetStateにより派生stateを書き込むパターン。フェッチ結果から計算できる値はuseEffectでsetしない。
metadata:
  type: feedback
---

`GoalWizard.tsx`（TCH-9）で発見された典型パターン。

フェッチ結果から1回だけ計算できる値（`isUsingPreviousGoals = !hasCurrent && source !== null`）を `useState(false)` + `useEffect` 内の `setIsUsingPreviousGoals(true)` で管理していた。

**Why:** `hasCurrent` と `previous_goals` は同じフェッチから確定する値なので、フェッチ後に必ず決まり以後変化しない「1回しか動かない state」になる。状態の数が不要に増え、判定条件が2箇所に分散すると条件差異からバグが生まれる。

**How to apply:** `useEffect` 内で計算できる値を `useState` + `setXxx(true)` で書いている箇所を見つけたら Critical として指摘する。同一ロジックが `source` 決定と `setIsUsingPreviousGoals` で微妙に異なる条件を使っていたことも二重管理として合わせて指摘する。

See also: [[jotai-atom-draft-sync-pattern]]
