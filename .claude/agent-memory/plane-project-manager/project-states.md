---
name: Tasche プロジェクト ステート一覧
description: TCH プロジェクトの全ステートID・名前・グループ・カラー（2026-04-25 確認）
type: project
---

## ステート一覧（Tasche / TCH）

確認日: 2026-04-25

| ステートID | 名前 | グループ | カラー | デフォルト |
|---|---|---|---|---|
| `c245c4f9-1dbb-4499-827b-be7557f92cdb` | Backlog | backlog | #60646C | true |
| `b4054629-70f2-4194-8d6f-f18553718f8f` | Todo | unstarted | #60646C | false |
| `caf882e5-6cfa-48c3-93ff-cd97532c1e21` | In Progress | started | #F59E0B | false |
| `2e0f7960-4649-4508-b508-c3eb37cf964c` | Done | completed | #46A758 | false |
| `5c87a3ef-6122-4f05-808c-8db738f89947` | Cancelled | cancelled | #9AA4BC | false |
| `b3b26d51-25dd-42d0-9149-e611c0e652ae` | Review | started | #8B5CF6 | false |

**Why:** ステート変更・タスク登録時にIDが必要なため事前に記録
**How to apply:** タスクのステートを指定する際は上記IDを使用する。"In Review" は存在せず "Review" のみ。
