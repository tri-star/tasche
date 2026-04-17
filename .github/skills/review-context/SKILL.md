---
name: review-context
description: Pull Request review に必要な diff、必須 docs、参照候補ファイル一覧を script で生成する。PR review 開始時に使う。
allowed-tools: shell
disable-model-invocation: true
---

# Review Context Skill

## 目的

Pull Request のレビューに必要な文脈を、AI の自由探索に頼りすぎずに生成する。

この skill は次を準備する。

- PR metadata
- base ブランチとの差分
- 必須 review docs
- 参照候補ファイル一覧
- risk map hit 情報

## 使う場面

- `pr-review` agent がレビュー開始時に review context を準備する時
- PR diff だけでは関連 docs を絞り込めない時
- path routing や keyword routing に基づく候補一覧が必要な時

## 手順

1. 次のファイルの存在を確認する
   - `docs/review/context-routing.yaml`
   - `docs/review/keyword-routing.yaml`
   - `docs/review/merge-judgement.md`
   - `docs/review/risk-map.yaml`
   - `docs/review/human-review-required.md`
2. skill のベースディレクトリから `scripts/build_review_context.py` を実行して `tmp/review/` 配下に review context を生成する
3. 生成された `tmp/review/context.json` を確認する
4. 必須 review docs と候補ファイル一覧を review agent に渡す

## 実行例

```bash
python3 .github/skills/review-context/scripts/build_review_context.py \
  --base-ref main \
  --repo owner/repo \
  --pr-number 123 \
  --title "Update dashboard layout" \
  --body-file /tmp/pr-body.txt \
  --author octocat \
  --output-dir tmp/review
```

## 出力

次のファイルを生成する。

- `tmp/review/pr-metadata.json`
- `tmp/review/diff.patch`
- `tmp/review/required-docs/merge-judgement.md`
- `tmp/review/required-docs/risk-map.yaml`
- `tmp/review/required-docs/human-review-required.md`
- `tmp/review/context.json`

## 注意点

- この skill は候補ファイル一覧を生成するが、候補ファイル本文を一括投入しない
- routing で選定できるものは script で選定する
- 判定そのものは行わない
