---
name: project-tch62-review
description: TCH-62 GoalsUpdate入力値バリデーション強化レビュー結果（record.pyのactual_unitsに同種の欠落あり）
metadata:
  type: project
---

TCH-62「GoalsUpdate入力値バリデーション強化」（コミット `bd06985`）をレビュー（2026-07-07）。
TCH-9で指摘された `Numeric(6,1)` カラムに対する `le` 上限欠落 / DoS対策欠落を `goal.py`
（`DailyAvailableUnits`/`DailyTargets` に `le=999.9`、`new_task_name` に `max_length=100`、
`goals` に `max_length=50`）で修正。IDOR・SQLi・レスポンス漏洩等はいずれも問題なし。

## 見つけた横展開漏れ

- `packages/backend/src/tasche/schemas/record.py` の `RecordCreate.actual_units` /
  `RecordUpdate.actual_units` / `DailyActuals` の各曜日フィールドは、`Record.actual_units`
  カラムが同じく `Numeric(6, 1, asdecimal=False)`（`models/record.py`）であるにもかかわらず、
  `le` 上限が設定されていない（`ge=0`, `multiple_of=0.1` のみ）。goal.py と全く同じ精度超過パターン。
  → Medium指摘として報告済み。次回 `record.py` に手を入れる際は要確認 [[project_tch61_review]] 的な
  「DBカラムの型・制約とPydanticスキーマの制約を突き合わせる」チェックを records 系にも適用すること。
- `GoalUpdateItem.task_id` / `RecordCreate.task_id` 等のID文字列フィールドに `max_length` がない
  （ULID形式で実質30文字程度のはずだが未制限）。Low指摘。全体的にリクエストボディサイズ上限の
  ミドルウェアも未設定。

**Why:** 同種のバリデーション欠落が他のリソース（records）にも存在する可能性が高く、次回 records
API に触れる際に真っ先に確認すべき項目のため記録する。
**How to apply:** `records.py` / `record.py` のバリデーション強化タスクが来たら、この指摘（`le=999.9`
相当の追加）を最初に確認する。DBモデルの `Numeric`/`String` の桁数・長さとPydanticスキーマの
制約を突き合わせるレビュー手順は今後も有効。
