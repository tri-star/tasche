# Review Context Design

- Status: Draft
- Date: 2026-04-15

## 目的

GitHub Actions 上で `pr-review` agent を実行する際に、レビュー対象 PR に必要な文脈を、AI の自由探索に過度に依存せずに生成する。

この設計では、shell や Python スクリプトで解決できる問題は skill 側で処理し、agent にはレビュー判定に集中させる。

## 設計方針

### 1. review context の生成は skill が担当する

review agent は、関連 docs や補助ファイルの選定を自力で広く探索しない。
代わりに、review context 専用 skill を利用して次を取得する。

- PR metadata
- base ブランチとの差分
- 必須 review docs
- 参照候補ファイル一覧
- 候補ファイルごとの説明と選定理由
- risk map hit 情報

### 2. AI ではなく script で決められるものは script で決める

次のような処理は、Python または shell スクリプトで解決する。

- 変更ファイル一覧の取得
- base ブランチとの差分生成
- path glob による docs 候補の抽出
- キーワードマッチによる docs 候補の抽出
- 候補ファイル一覧の重複除去
- risk map の機械的マッチング

### 3. Agent には最小限の本文だけを渡す

AI へ大量の関連ファイル本文を一括投入しない。
本文を直接渡すのは判定に必須な review docs のみとする。

- `docs/review/merge-judgement.md`
- `docs/review/risk-map.yaml`
- `docs/review/human-review-required.md`

その他の docs やコードは、skill が生成した候補一覧をもとに必要時のみ確認する。

## 役割分担

### review context skill

責務:

- PR metadata の収集
- diff の生成
- `context-routing.yaml` に基づく path routing
- `keyword-routing.yaml` に基づく keyword routing
- risk map hit の抽出
- candidate files 一覧の生成
- agent に渡す review context の整形

出力:

- `tmp/review/pr-metadata.json`
- `tmp/review/diff.patch`
- `tmp/review/required-docs/*`
- `tmp/review/context.json`

### pr-review agent

責務:

- review context skill を使って文脈を取得する
- 必須 review docs を読む
- 必要な候補ファイルだけを確認する
- 最終 verdict を JSON で出す
- line comment 候補と summary comment 向け内容を出す

## 生成物

### `tmp/review/pr-metadata.json`

PR の基本情報を格納する。

### `tmp/review/diff.patch`

`origin/<base>...HEAD` の unified diff を格納する。

### `tmp/review/required-docs/*`

必須 review docs の複製を格納する。

### `tmp/review/context.json`

skill が生成した review context を格納する。
このファイルには候補本文ではなく、候補パスと説明を含める。

例:

```json
{
  "risk_map_hits": [
    {
      "path": "packages/frontend/src/routes/_layout.tsx",
      "risk": "medium",
      "reason": "主要画面導線への影響"
    }
  ],
  "candidate_files": [
    {
      "path": "packages/frontend/AGENTS.md",
      "description": "frontend に関する docs の入口",
      "reason": "frontend 配下の変更があるため"
    }
  ],
  "routing_sources": [
    "docs/review/context-routing.yaml",
    "docs/review/keyword-routing.yaml"
  ]
}
```

## skill の配置

review context skill は `.github/skills/review-context/` に配置する。

構成例:

```text
.github/skills/review-context/
  SKILL.md
  scripts/
    build_review_context.py
```

`SKILL.md` には frontmatter を持たせ、`allowed-tools` で script 実行に必要な tool を許可する。
初期版では `disable-model-invocation: true` とし、review agent から明示的に呼び出す。

## Agent から skill を使う方針

review agent は、レビュー開始時に review context skill を使って必要なファイルを用意する。

初期版の方針:

- skill 利用のための専用 front matter 設定は追加しない
- agent 本文で `/review-context` skill を利用するよう明示する
- skill 実行に必要な shell / Python 実行権限は agent が持つ前提とする

## path routing と keyword routing

候補ファイル一覧は次の 2 ファイルをもとに skill が生成する。

- `docs/review/context-routing.yaml`
- `docs/review/keyword-routing.yaml`

### path routing

変更ファイルパスの glob に応じて、関連 docs の候補を追加する。

### keyword routing

PR title、PR body、変更ファイルパス、diff 中のキーワードに応じて、追加候補を追加する。

## 初期版でやらないこと

- changed file 全文の一括投入
- import graph の深い解析
- repository 全体の自由探索
- シンボル単位の静的解析

## 注意点

- 候補ファイルは多すぎると逆に agent の探索が不安定になるため、上限を設ける
- 候補ごとに説明と選定理由を残す
- skill は deterministic に近い挙動に寄せる
- routing の変更は docs と設定ファイルに反映し、後で追跡可能にする
