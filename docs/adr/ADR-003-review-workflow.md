# ADR-001: AI PR Review Workflow

- Status: Accepted
- Date: 2026-04-15

## Context

GitHub Pull Request に対して AI によるレビューを行い、次の 2 値で判定する仕組みを構築したい。

- `mergeable`
- `human-review`

当初は、repository 内のガイドライン違反や不明点があれば広く `human-review` に倒す方針も検討した。
しかし、この方針では軽微な品質課題や将来的な改善項目によって PR が止まりやすくなる。
本プロジェクトでは「明らかな不具合、重大なセキュリティ問題、深刻な性能懸念以外は別 PR で改善し、なるべく早くマージする」文化を目指すため、AI と人間のレビュー基準も同じ軸に揃える必要があった。

また、AI に大量の関連ファイル本文を一度に与えると、コンテキスト汚染による性能低下や指示追従性の低下が懸念された。
Claude Code の Progressive Disclosure のような「必要な時だけ読む」方式が望ましいが、GitHub Copilot CLI では同等の仕組みが明確に保証されているかを公式ドキュメントで確認する必要があった。

## Decision

### 1. 最終判定の軸は「安全な即時マージ可否」に限定する

AI の役割はコード品質全般の採点ではなく、「この PR を今すぐ安全にマージしてよいか」を判定することとする。

次のいずれかに該当する場合のみ `human-review` とする。

- 危険度マップで `high` と定義された領域の変更が含まれる
- repository 内 docs で定義した「必ず人間によるレビューが必要な条件」に合致すると AI が判断する
- デプロイすると即不具合につながる可能性が高い
- 認証、認可、IDOR、情報漏洩などの重大なセキュリティ問題が残る
- 深刻なパフォーマンス劣化が予測される

上記以外の問題は、レビューコメントとして指摘しても最終判定は `mergeable` とする。

### 2. 判定ルールは repository 内 docs として明文化する

AI の自由判断を避けるため、最低限次の docs を repository 内に持つ前提とする。

- `docs/review/risk-map.yaml`
- `docs/review/human-review-required.md`
- `docs/review/merge-judgement.md`

AI はこれらの docs を判定の根拠として利用し、repository に存在しないルールを新たに作ってはならない。

### 3. GitHub Copilot CLI には大量の本文を渡さず、候補パス中心で文脈を与える

Copilot CLI について公式ドキュメントを確認した結果、次の点は確認できた。

- `@path` による明示的なファイル文脈追加が可能
- `Explore` などのエージェントがあり、コードベース探索を main context とは別の文脈で行う説明がある
- custom agent を作成でき、subagent により main context の混雑を抑える説明がある
- GitHub Actions から programmatic mode で実行可能

一方で、Claude Code の Progressive Disclosure と同等の仕組みが、GitHub Actions 上の Copilot CLI 無人実行で明確に保証されているとは判断しなかった。
そのため、初期設計では次の方針を採用する。

- 必須ルール docs のみ本文を直接与える
- その他の関連 docs や周辺コードは、スクリプトで「候補パス一覧 + 説明」を作成して渡す
- Copilot には「まず base ブランチとの差分を確認し、必要な候補ファイルだけ読む」ように指示する
- changed file の全文をまとめて投入しない

### 3.1 レビュー専用の instructions は `.github/agents/pr-review.agent.md` に集約する

`.github/copilot-instructions.md` は repository 内で常時ロードされる前提のため、普段の開発時にもレビュー専用指示が混入するリスクがある。
このため、レビューに関するルール、手順、出力形式、禁止事項は `.github/agents/pr-review.agent.md` に集約し、PR レビュー実行時のみ明示的にその agent を指定して使う。

初期版では、レビュー用途の `copilot-instructions.md` は作成しない。

### 3.2 関連 docs の探索は skill と script を優先して解決する

レビュー時にどの docs や補助ファイルを参照すべきかは、AI の自由探索に任せすぎない。
shell や Python スクリプトで機械的に解決できる部分は、review 専用 skill に切り出して処理する。

具体的には次の方針を採用する。

- `.github/skills/` 配下に review context 生成用 skill を配置する
- skill の `SKILL.md` に手順を記述し、必要に応じて `scripts/` 配下の補助スクリプトを実行する
- review agent はこの skill を呼び出して、PR metadata、必須 docs、候補ファイル一覧を取得してからレビューを行う

GitHub Docs 上は、skills は instructions、scripts、resources を持てる仕組みとして定義されており、Copilot が relevant と判断した時に利用される。
また、custom agent 側で skill 利用のための専用 front matter 設定は必須とはされていない。
必要なのは、skill 実行に必要な tool へのアクセス権である。

そのため、初期版では review agent の front matter に skill 専用設定は追加せず、agent 本文で review context skill を利用するよう明示する。

### 4. PR コメントは summary と line comment を分ける

AI レビューの結果は次の 2 段で GitHub に残す。

- PR 全体の verdict と根拠を更新する summary comment
- 行が特定できる指摘のみを投稿する GitHub Review Comment API による line comment

行番号が曖昧な指摘は summary にのみ記録する。

### 5. 判定結果は JSON として保存する

PR コメントだけでは後日の集計が難しいため、レビュー結果は S3 に JSON で保存する。
必須項目は次のとおり。

- `repo`
- `pr_number`
- `head_sha`
- `run_at`
- `verdict`
- `confidence`
- `reasons`
- `violated_docs`
- `touched_paths`
- `referenced_paths`
- `author`
- `tool`
- `review_comment_url`

## Consequences

### Positive

- AI と人間のレビュー基準を「安全な即時マージ可否」に揃えやすい
- 軽微な品質問題で PR を止めにくくなる
- 危険領域や重大問題にレビュー労力を集中できる
- 後日、判定成功率や missed issue を集計しやすい
- repository 内 docs を運用の単一の根拠として育てられる

### Negative

- `mergeable` でも品質改善余地は残り得る
- `risk-map.yaml` や `human-review-required.md` の保守が必要
- Copilot CLI の自律探索能力に過度に依存せず、候補パス生成ロジックもメンテナンスが必要
- line comment の行特定精度には限界がある

## Alternatives Considered

### A. 不明点やガイドライン違反があれば広く `human-review` にする

却下。
PR が止まりやすくなり、「別 PR で改善しつつ速くマージする」という目標と合わない。

### B. 変更ファイルや関連ファイルの本文をまとめて AI に投入する

却下。
コンテキスト肥大化による性能低下と、指示追従性の低下が懸念される。

### C. GitHub Copilot CLI に Progressive Disclosure 相当の機能がある前提で全探索を任せる

却下。
公式ドキュメントから、Actions 上の無人実行で同等の保証があるとは判断しなかった。
そのため、初期版では候補パス中心の明示的な文脈制御を採用する。

## Related Notes

- GitHub Actions は `pull_request.opened` と `pull_request.synchronize` で実行し、draft PR は対象外とする
- 日次評価では `ai-eval:success` または `ai-eval:failure` ラベルが付与された PR のみ集計対象とする
- ラベル未付与の PR は `excluded` として集計対象外にする
