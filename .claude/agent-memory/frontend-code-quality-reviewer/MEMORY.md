# Memory Index
- [Custom task dialogs](task-dialog-accessibility.md) — TCH-6 introduced hand-rolled dialogs, so future reviews should explicitly verify focus trap and async error announcement.
- [jotai + useState draft sync](feedback_jotai_draft_reset.md) — TCH-15: 保存成功後に draft を setDraft でリセットしないと「保存」ボタンが有効のまま残るバグ。jotai atom + useState draft フォームを見たら必ず確認。
- [useEffect内の派生state書き込み](feedback_derived_state_from_effect.md) — TCH-9: フェッチ結果から計算できる値をuseEffect+setStateで管理する反パターン。同一条件を2箇所に書く二重管理も合わせてCriticalとして指摘する。
- [スプライト画像のアクセシビリティ](feedback_sprite_accessibility.md) — TCH-64: backgroundImage スプライト div は aria-hidden="true" か role="img"+aria-label が必須。隣接テキストで情報補完されていても明示が必要。
