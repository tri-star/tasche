# Memory Index
- [Custom task dialogs](task-dialog-accessibility.md) — TCH-6 introduced hand-rolled dialogs, so future reviews should explicitly verify focus trap and async error announcement.
- [jotai + useState draft sync](feedback_jotai_draft_reset.md) — TCH-15: 保存成功後に draft を setDraft でリセットしないと「保存」ボタンが有効のまま残るバグ。jotai atom + useState draft フォームを見たら必ず確認。
