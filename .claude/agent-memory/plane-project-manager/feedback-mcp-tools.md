---
name: MCP ツール利用制限（Plane）
description: list_work_items など一部のPlane MCPツールが特定セッションで利用不可になる問題
type: feedback
---

## 問題

以下の Plane MCP ツールが「No such tool available」エラーになるセッションがある：

- `mcp__plane__list_work_items`
- `mcp__plane__retrieve_work_item`
- `mcp__plane__get_issue_using_readable_identifier`
- `mcp__plane__retrieve_work_item_by_identifier`
- `mcp__plane__create_work_item_link`
- `mcp__plane__list_work_item_comments`

一方、以下は正常に動作する：

- `mcp__plane__list_states`
- `mcp__plane__list_labels`
- `mcp__plane__get_workspace_members`
- `mcp__plane__list_modules`
- `mcp__plane__create_state` / `update_state` / `delete_state`
- `mcp__plane__create_module` / `update_module` / `delete_module`
- `mcp__plane__create_label` / `update_label` / `delete_label`

**Why:** MCP サーバーの接続状態によって登録ツールが変わる可能性がある。settings.local.json に許可リストはあるが、実際のMCPサーバーからツール定義が提供されていない場合は利用不可。

**How to apply:** タスク一覧取得が必要な場合、Claude Code セッション再起動またはMCP再接続を案内する。外部HTTP（api.plane.so）もサンドボックス制限により不可。
