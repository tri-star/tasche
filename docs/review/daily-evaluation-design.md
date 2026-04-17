# Daily Evaluation Design

- Status: Draft
- Date: 2026-04-15

## 目的

AI review の実行結果を日次で評価し、成功率と補助指標を継続的に追跡できるようにする。

## 入力

日次評価は次の 2 系統の入力を使う。

1. S3 に保存された `reviews/` の review result JSON
2. GitHub API から取得した PR ラベル情報

## 集計対象

前日までに review が実行された PR を対象とする。
ただし、`ai-eval:success` または `ai-eval:failure` が付いていない PR は `excluded` とし、成功率の母数から除外する。

## ラベルの意味

- `ai-verdict:mergeable`
- `ai-verdict:human-review`
- `ai-eval:success`
- `ai-eval:failure`
- `ai-review:missed-issue`
- `ai-review:false-positive`

`ai-eval:*` は人間レビュアーが手動で付与する。

## 評価ロジック

### evaluation status

- `ai-eval:success` がある: `success`
- `ai-eval:failure` がある: `failure`
- 上記がない: `excluded`

### 補助フラグ

- `ai-review:missed-issue` がある: `missed_issue = true`
- `ai-review:false-positive` がある: `false_positive = true`

## 出力

### 1. evaluation result

各 PR ごとに `evaluations/` へ保存する。

例:

```json
{
  "repo": "owner/repo",
  "pr_number": 123,
  "head_sha": "abc123",
  "review_run_at": "2026-04-15T01:00:00Z",
  "evaluated_at": "2026-04-16T06:00:00Z",
  "verdict": "mergeable",
  "evaluation_status": "success",
  "labels": [
    "ai-verdict:mergeable",
    "ai-eval:success"
  ],
  "missed_issue": false,
  "false_positive": false
}
```

### 2. daily summary

日次サマリを `aggregates/daily/` へ保存する。

例:

```json
{
  "repo": "owner/repo",
  "date": "2026-04-16",
  "review_runs": 12,
  "evaluated_runs": 9,
  "excluded_runs": 3,
  "mergeable": {
    "total": 5,
    "success": 4,
    "failure": 1,
    "precision": 0.8
  },
  "human_review": {
    "total": 4,
    "success": 3,
    "failure": 1,
    "precision": 0.75
  },
  "missed_issue_count": 1,
  "false_positive_count": 1
}
```

### 3. weekly summary

月曜日の実行時に、直近 7 日を対象に `aggregates/weekly/` へ保存する。

## 通知

### GitHub Issue

固定 Issue `AI Review Daily Summary` を更新する。

表示内容:

- 当日 summary
- 直近 7 日の簡易表
- missed issue / false positive 件数

### Slack

同一チャンネルへ日次サマリを送信する。
月曜日は週次サマリも追加で送信する。

## Lambda 構成

初期版では Lambda は 1 本とする。

責務:

- 対象 review result の取得
- PR ラベル取得
- evaluation result 生成
- daily / weekly summary 生成
- S3 保存
- GitHub Issue 更新
- Slack 通知

## Athena

Athena は S3 上の `reviews/`, `evaluations/`, `aggregates/` を直接参照する。

まず見る指標は次の 2 つ。

- `mergeable precision`
- `human-review precision`

補助指標:

- `missed_issue_count`
- `false_positive_count`
- `excluded_runs`
