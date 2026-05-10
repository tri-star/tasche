# ADR006: デプロイトリガー戦略

- Status: Accepted
- Date: 2026-05-08

## Context

Tasche のデプロイパイプライン (TCH-19) で、frontend / backend を独立してデプロイ可能、かつ dev / prod を独立してデプロイ可能とする要件があった。組み合わせは 4 経路 (FE×dev, FE×prod, BE×dev, BE×prod)。

候補:

1. **main マージで自動 (パスフィルタで FE/BE 切替)**: シンプルだが「FE だけ意図的にリリース」が難しい。
2. **長命 release/* ブランチへのマージ**: 4 本のブランチ維持コスト。
3. **タグ push (FE/BE × dev/prod を tag prefix で分離)**: タグはイミュータブルで履歴追跡しやすい。dev/prod ともに「明示的に切る」運用になる。
4. **workflow_dispatch のみ手動**: 自動化の利点が薄い。

## Decision

**タグ運用 (案 3)** を採用する。

### タグ命名規約

- `release/frontend-dev/<version>` — frontend を dev にデプロイ
- `release/backend-dev/<version>` — backend を dev にデプロイ
- `release/frontend-prod/YYYY-MM-DD-N` — frontend を prod にデプロイ (日付ベース)
- `release/backend-prod/YYYY-MM-DD-N` — backend を prod にデプロイ (日付ベース)

### GitHub Actions workflow

- `.github/workflows/deploy-{app}-{env}.yml` の 4 ファイル構成 (今回は dev の 2 本のみ実装。prod は TCH-48 で実装)
- `on.push.tags: ['release/{app}-{env}/**']` + `workflow_dispatch` (ロールバック用)
- `concurrency: deploy-${env}-${app}` で同一環境への並行デプロイを直列化
- `permissions: id-token: write` で OIDC AssumeRole

### ロールバック方針

- 旧タグを `workflow_dispatch` の input として指定して再デプロイ。
- SAM の冪等更新により旧バージョンの ImageUri / S3 コンテンツに巻き戻る。

## Consequences

### Positive

- タグはイミュータブルなので「何時にどのコミットがデプロイされたか」が一意に追跡可能。
- prod は GitHub Releases と組み合わせれば、変更履歴が自動的に蓄積される。
- FE/BE のリリースペースを完全に分離できる。"backend だけ先に出す / frontend は週末リリース" が自然にできる。
- environment protection rules を `prod` に対して設定すれば、承認必須にできる (タグ push 自体は誰でもできるため、protection で抑える)。

### Negative / Trade-off

- dev も「タグを切る」手間が発生する (PR マージで自動反映される運用と比べて 1 ステップ増える)。
  - dev にこの運用を選んだのは、本番と同じトリガー方式に揃えることでデプロイ手順の練習機会を増やすため。
  - 連続コミット時はまとめて 1 タグで投入するなど、運用で軽減可能。
- ブランチ運用 (案 2) と比べ「現在の prod がどのコミットか」を確認するには `git for-each-ref` などタグ検索が必要。

### Why not main マージ自動 (案 1)

検討途中まで案 1 を推奨案としていたが、最終的に「dev でも prod と同じ手順を踏ませたい」「FE だけ意図的にリリース、BE は留めるという選択肢を残したい」という意向で案 3 に決定した。

## References

- 議事録: `docs/work-logs/20260508-deploy-pipeline/plan.md`
- workflow 実装: `.github/workflows/deploy-backend-dev.yml`, `.github/workflows/deploy-frontend-dev.yml`
- prod 実装フォロータスク: TCH-48
