# GitHub Actions タグデプロイ手順

Tasche の通常デプロイは、Git tag を `origin` に push して GitHub Actions を起動する方式で行う。frontend / backend は個別にデプロイでき、現在 Actions として実装済みなのは dev 環境向けの 2 経路である。

関連ドキュメント:

- 手動デプロイ手順: `docs/deploy/manual-deploy.md`
- SSM / IAM 命名規約: `docs/deploy/ssm-naming.md`
- トリガー戦略: `docs/adr/ADR-006-deploy-trigger-strategy.md`
- workflow 実装: `.github/workflows/deploy-backend-dev.yml`, `.github/workflows/deploy-frontend-dev.yml`

## デプロイ経路

| 対象 | 環境 | tag prefix | workflow | 状態 |
| --- | --- | --- | --- | --- |
| backend | dev | `release/backend-dev/` | `deploy-backend-dev` | 実装済み |
| frontend | dev | `release/frontend-dev/` | `deploy-frontend-dev` | 実装済み |
| backend | prod | `release/backend-prod/` | 未実装 | TCH-48 で実装予定 |
| frontend | prod | `release/frontend-prod/` | 未実装 | TCH-48 で実装予定 |

## 前提

- デプロイ対象のコミットが `origin/main` に入っていること
- 対象コミットの CI が成功していること
- GitHub Actions の `dev` environment に必要な Variables / 権限が設定されていること
  - backend: `vars.AWS_DEPLOY_ROLE_ARN`
  - frontend: `vars.AWS_DEPLOY_ROLE_ARN_DEV`
- AWS 側の IAM, SSM Parameter, Secrets Manager, ACM など外部リソースが準備済みであること
- tag は一度 push したら原則として作り直さないこと

## tag 命名

dev 環境では、日付と連番を含めた次の形式を使う。

```text
release/backend-dev/YYYY-MM-DD-N
release/frontend-dev/YYYY-MM-DD-N
```

例:

```text
release/backend-dev/2026-05-24-1
release/frontend-dev/2026-05-24-1
```

同じ日に複数回デプロイする場合は末尾の連番を増やす。

## Backend を dev にデプロイする

### 1. デプロイ対象を確認する

```bash
git fetch origin main --tags
git switch main
git pull --ff-only origin main
git log --oneline -5
```

必要であれば GitHub 上で `main` の backend CI が成功していることを確認する。

### 2. tag を作成する

```bash
TAG=release/backend-dev/2026-05-24-1
git tag -a "$TAG" -m "Deploy backend dev 2026-05-24-1"
```

特定コミットを明示して tag を切る場合:

```bash
TAG=release/backend-dev/2026-05-24-1
git tag -a "$TAG" <commit-sha> -m "Deploy backend dev 2026-05-24-1"
```

### 3. tag を push する

```bash
git push origin "$TAG"
```

push 後、`.github/workflows/deploy-backend-dev.yml` が起動する。workflow は tag のコミットを checkout し、OIDC で AWS ロールを AssumeRole した後、`packages/backend/infra` で次を実行する。

1. Lambda Extension layer を取得する
2. `sam build --config-env dev` で Lambda コンテナイメージをビルドする
3. `sam deploy --config-env dev` で backend stack を更新する

backend の dev stack 名は `packages/backend/infra/samconfig.toml` の `dev.deploy.parameters.stack_name` に従う。

## Frontend を dev にデプロイする

### 1. デプロイ対象を確認する

```bash
git fetch origin main --tags
git switch main
git pull --ff-only origin main
git log --oneline -5
```

必要であれば GitHub 上で `main` の frontend CI が成功していることを確認する。

### 2. tag を作成する

```bash
TAG=release/frontend-dev/2026-05-24-1
git tag -a "$TAG" -m "Deploy frontend dev 2026-05-24-1"
```

特定コミットを明示して tag を切る場合:

```bash
TAG=release/frontend-dev/2026-05-24-1
git tag -a "$TAG" <commit-sha> -m "Deploy frontend dev 2026-05-24-1"
```

### 3. tag を push する

```bash
git push origin "$TAG"
```

push 後、`.github/workflows/deploy-frontend-dev.yml` が起動する。workflow は tag のコミットを checkout し、OIDC で AWS ロールを AssumeRole した後、次を実行する。

1. `pnpm install --frozen-lockfile` で依存関係をインストールする
2. `packages/frontend` で `pnpm build:dev` を実行する
3. `packages/frontend/infra` で `sam deploy --config-env dev` を実行する
4. `packages/frontend/dist` を S3 に同期する
5. CloudFront の `/index.html` と `/` を invalidation する

frontend の dev stack 名は `packages/frontend/infra/samconfig.toml` の `dev.deploy.parameters.stack_name` に従う。

## Backend / Frontend の順序

通常の更新では、変更した対象だけをデプロイすればよい。

API contract を変更する場合は、互換性を保った順序でデプロイする。基本方針は次の通り。

- backend が古い frontend と互換性を保てる変更なら、backend を先にデプロイしてから frontend をデプロイする
- frontend が新 API を必須にする変更なら、backend のデプロイ完了と疎通確認後に frontend をデプロイする
- backend と frontend を同時に破壊的変更する運用は避け、互換期間を作る

完全な新規環境では frontend / backend 間に CloudFront Distribution ID と Backend Function URL の依存があるため、`docs/deploy/manual-deploy.md` の初回構築メモも確認する。

## GitHub Actions の確認

GitHub UI では、対象 repository の Actions タブから `deploy-backend-dev` または `deploy-frontend-dev` を確認する。

`gh` CLI を使う場合:

```bash
gh run list --workflow deploy-backend-dev.yml --limit 5
gh run list --workflow deploy-frontend-dev.yml --limit 5
```

特定 run のログを確認する場合:

```bash
gh run view <run-id> --log
```

成功後は、workflow の `Show outputs` または AWS CloudFormation の stack outputs で更新先を確認する。

## デプロイ後の疎通確認

Backend:

```bash
curl -i "https://<frontend-domain>/api/health"
```

Frontend:

```bash
curl -I "https://<frontend-domain>/"
```

より詳細な AWS CLI での確認手順は `docs/deploy/manual-deploy.md` の backend / frontend 各「動作確認」を参照する。

## 失敗時の切り分け

### workflow が起動しない

- tag prefix が正しいか確認する
  - backend dev: `release/backend-dev/`
  - frontend dev: `release/frontend-dev/`
- tag が `origin` に push されているか確認する

```bash
git ls-remote --tags origin "release/backend-dev/*"
git ls-remote --tags origin "release/frontend-dev/*"
```

### AWS 認証で失敗する

- GitHub Environment `dev` の Variables が workflow と一致しているか確認する
  - backend: `AWS_DEPLOY_ROLE_ARN`
  - frontend: `AWS_DEPLOY_ROLE_ARN_DEV`
- IAM Role の trust policy が GitHub OIDC を許可しているか確認する
- `docs/deploy/ssm-naming.md` に記載のデプロイ用ロール権限を満たしているか確認する

### `sam deploy` が失敗する

CloudFormation の stack event で最初の `CREATE_FAILED` / `UPDATE_FAILED` を確認する。

```bash
aws cloudformation describe-stack-events \
  --stack-name dev-tasche-backend \
  --region ap-southeast-1 \
  --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
  --output table
```

frontend の場合:

```bash
aws cloudformation describe-stack-events \
  --stack-name dev-tasche-frontend \
  --region ap-southeast-1 \
  --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
  --output table
```

### frontend の S3 sync / CloudFront invalidation が失敗する

- CloudFormation output に `AssetsBucketName` と `DistributionId` が出ているか確認する
- デプロイロールに S3 sync と CloudFront invalidation の権限があるか確認する
- `packages/frontend/dist` が生成されているか、`Build frontend` step のログを確認する

## ロールバック

ロールバックは `workflow_dispatch` で過去の tag または commit SHA を指定して再デプロイする。

1. GitHub Actions で `deploy-backend-dev` または `deploy-frontend-dev` を開く
2. `Run workflow` を選ぶ
3. `ref` にロールバック先の tag または commit SHA を入力する
4. 実行後、疎通確認を行う

例:

```text
release/backend-dev/2026-05-23-1
release/frontend-dev/2026-05-23-1
```

CLI で実行する場合:

```bash
gh workflow run deploy-backend-dev.yml --ref main -f ref=release/backend-dev/2026-05-23-1
gh workflow run deploy-frontend-dev.yml --ref main -f ref=release/frontend-dev/2026-05-23-1
```

`--ref main` は workflow 定義を読み込むブランチであり、実際にデプロイされる ref は input の `ref` である。

## tag を間違えた場合

まだ workflow が動いていない、またはデプロイ前に止められる場合のみ、GitHub UI で run を cancel する。

一度 push した tag は監査上の意味を持つため、原則として削除・作り直しはしない。誤った tag でデプロイされた場合は、正しい過去 tag / commit を `workflow_dispatch` で再デプロイして復旧する。
