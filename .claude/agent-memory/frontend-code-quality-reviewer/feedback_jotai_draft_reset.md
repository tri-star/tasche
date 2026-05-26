---
name: jotai-atom-draft-sync-pattern
description: jotai atomとuseStateのdraftを併用するフォームでは、保存成功後にdraftをサーバー確定値でリセットしないと「保存」ボタンが有効のまま残るバグが発生する
metadata:
  type: feedback
---

`TimezoneSection` パターン（TCH-15）で発見された典型的バグ。

jotai atom から `initial` を計算値として毎レンダー取得し、`useState` で `draft` を管理し、`isDirty = draft !== initial` でボタンの disabled を制御する場合:

- `handleSave` 成功後に `setSettings(updated)` で atom を更新すると `initial` は新しい値になる
- しかし `draft` は `useState` の内部状態なのでリセットされない
- 結果: `draft === initial` が成立せず、保存後もボタンが有効のまま残る

**Why:** `useState` の初期値は初回マウント時のみ評価される。atom の変化は `useState` に伝播しない。

**How to apply:** jotai atom + useState draft を使うフォームレビューでは、「保存成功後に draft をリセットしているか」を必ずチェックする。

```tsx
// 正しいパターン
const updated = await mutateAsync({ timezone: draft })
setSettings(updated)
setDraft(updated.timezone)  // ← draft も揃えて更新
```
