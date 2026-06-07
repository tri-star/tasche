# Memory Index
- [Custom task dialogs](task-dialog-accessibility.md) — TCH-6 introduced hand-rolled dialogs, so future reviews should explicitly verify focus trap and async error announcement.
- [jotai + useState draft sync](feedback_jotai_draft_reset.md) — TCH-15: 保存成功後に draft を setDraft でリセットしないと「保存」ボタンが有効のまま残るバグ。jotai atom + useState draft フォームを見たら必ず確認。
- [useEffect内の派生state書き込み](feedback_derived_state_from_effect.md) — TCH-9: フェッチ結果から計算できる値をuseEffect+setStateで管理する反パターン。同一条件を2箇所に書く二重管理も合わせてCriticalとして指摘する。
- [スプライト画像のアクセシビリティ](feedback_sprite_accessibility.md) — TCH-64: backgroundImage スプライト div は aria-hidden="true" か role="img"+aria-label が必須。隣接テキストで情報補完されていても明示が必要。
- [Checkbox二重ハンドラ](feedback_checkbox_double_handler.md) — TCH-65: button内にCheckbox(onCheckedChange)を同居させるとダブルトグルが発生。toggle責務はどちらか一方に一本化する。
- [テーブル内number inputのaria-label欠落](feedback_aria_label_table_inputs.md) — TCH-65: N×Mテーブル内のinputはth見出しでは自動ラベル付けされない。aria-label必須。
- [E2Eでのoverflow検出パターン](feedback_e2e_overflow_check.md) — TCH-65: overflow-x-autoコンテナの内部オーバーフローはgetBoundingClientRectでは誤検知。scrollWidth<=clientWidthを使う。
- [WeeklyMatrix固定カラー](feedback_weekly_matrix_color_tokens.md) — TCH-16: getCompletionColorClassが固定red/yellow/greenを使用。dark:修飾子はあるがセマンティックトークン化未完。段階グラデーション用トークン追加が必要。
