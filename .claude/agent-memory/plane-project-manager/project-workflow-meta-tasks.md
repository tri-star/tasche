---
name: project-workflow-meta-tasks
description: Tascheプロジェクトの一部Plane課題は「アプリのコード実装」ではなく「.claude/skills, .claude/agents配下のワークフロー定義ドキュメント」の見直しを指すメタタスクである
metadata:
  type: project
---

TCH-93「task-workflowの見直し」(内部ID: de47627d-5223-4ed8-ad6d-36ffbbe1fd58) は、
Tascheアプリ自体のコード実装タスクではなく、リポジトリ内の以下のようなエージェント/スキル定義ファイル（Markdown）を編集するメタタスクだった（2026-07-11時点の本文調査結果）。

- `.claude/skills/task-workflow/SKILL.md`（`.agents/skills/task-workflow/SKILL.md` にも同名の対応版が存在）
- `.claude/agents/plane-project-manager.md`（このエージェント自身の定義。「呼び出し条件」はdescriptionのexample群として表現されている）
- `.claude/workflows`, `.claude/commands` 配下（`/loop` のような新規コマンド追加が検討事項に含まれる場合はここも対象）

**Why**: Tascheプロジェクトでは、開発プロセス自体（Claude Codeのagent/skill構成）もPlaneのWorkItemとして管理されている。「task-workflow」「frontend-workflow」「backend-workflow」等の名前を含むタスクは、まず `find .claude .agents -iname "*<keyword>*"` でリポジトリ内の対応するskill/agent定義ファイルの実在を確認し、その内容と本文の検討事項を突き合わせるとよい。

**How to apply**: 同様に「〜workflowの見直し」「〜エージェントの呼び出し条件を追加」のような課題が来た場合、それはアプリケーションコードではなくドキュメント（SKILL.md, agentのmarkdown定義, .claude/commands等）の編集タスクである可能性が高い。着手前にリポジトリ内の該当ファイルを検索し、本文中のキーワード（例: task-id, review状態, /loop）が具体的にどのファイルのどの記述に対応するかを対応付けてから報告・提案するとよい。
