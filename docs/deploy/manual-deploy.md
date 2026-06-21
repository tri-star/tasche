# 手動デプロイ手順

通常の dev 環境デプロイは GitHub Actions の `release/<app>-dev/<version>` タグ push で実行されるが、CI の障害時や検証用途で **手元から手動デプロイ** したいケースがある。本ドキュメントは backend / frontend それぞれの手動デプロイ手順をまとめる。

関連ドキュメント:

- GitHub Actions タグデプロイ手順: `docs/deploy/github-actions-tag-deploy.md`
- 命名規約: `docs/deploy/ssm-naming.md`
- ADR: `docs/adr/ADR-005-backend-lambda-packaging.md`, `docs/adr/ADR-006-deploy-trigger-strategy.md`

## 現状実装メモ (2026-05-22)

- `samconfig.toml` の dev stack 名は backend が `dev-tasche-backend`、frontend が `dev-tasche-frontend`。
- backend Function URL は現在 `AuthType: NONE` で一時運用中。CloudFront 側は Lambda OAC `SigningBehavior: no-override` を使っており、viewer の `Authorization` を origin にそのまま渡す。
- frontend は backend stack が自動作成する SSM パラメータ `/tasche/<env>/sam/backend-function-url` を参照する。
- backend stack は `CloudFrontDistributionId` を必須 parameter として持つため、完全な新規環境では frontend Distribution ID を確定させてから backend を再デプロイする前提がある。

## 前提

- AWS CLI v2 と SAM CLI v1.100+ がインストール済みであること
- Docker (buildx 対応) が動作すること (backend のみ)
- 必要に応じて pnpm 9, Node.js 22 (frontend のみ)
- AWS 認証情報がローカルから利用可能であること
  - 推奨: `aws configure sso` または GitHub Actions と同等の OIDC ロールを `aws sts assume-role` で取得
  - 必要権限: `docs/deploy/ssm-naming.md` に記載の GitHub Actions デプロイ用ロールと同等
- 環境変数 (本ドキュメント全体で使用):

  ```bash
  export AWS_REGION=ap-southeast-1
  export ENV_NAME=dev
  export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ```

- 外部リポジトリ側のセットアップ (IAM, SecretsManager, ACM, SSM Parameter) が完了していること

## 共通の事前確認

```bash
# SSM パラメータが揃っているか確認
aws ssm get-parameters-by-path \
  --path "/tasche/${ENV_NAME}/" \
  --recursive \
  --region "$AWS_REGION" \
  --query "Parameters[].Name"
```

## Backend (Lambda コンテナイメージ) を手動デプロイする

### 1. リポジトリのチェックアウト & ブランチ確認

デプロイしたいコミット (通常は `main` か `release/backend-dev/<version>` タグ) を checkout する。

```bash
git fetch --all --tags
git checkout <commit-or-tag>
cd packages/backend
```

### 2. Lambda Extension Layer の署名 URL 解決

AWS 認証が必要なのは Layer zip の署名 URL 解決までで、download / unzip 自体は Dockerfile の中間ステージで実施する。

```bash
eval "$(bash scripts/fetch-lambda-extensions.sh)"
# SECRETS_LAYER_URL / ADOT_LAYER_URL が shell に export される
```

### 3. SAM ビルド

```bash
cd infra

sam build \
  --config-env "$ENV_NAME" \
  --parameter-overrides \
    "SecretsLayerUrl=${SECRETS_LAYER_URL}" \
    "AdotLayerUrl=${ADOT_LAYER_URL}"
```

### 4. SAM デプロイ

```bash
sam deploy \
  --config-env "$ENV_NAME" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset
```

初回デプロイ時は、`packages/backend/infra/samconfig.toml` の `resolve_image_repos = true` に従って、
SAM CLI が backend 用 ECR リポジトリを自動作成した上でイメージを push する。

`packages/backend/infra/template.yaml` では `CloudFrontDistributionId` が必須で、dev 用 `samconfig.toml` には既存 Distribution ID が入っている。新規環境で ID が未確定なら、frontend stack 作成後に `parameter_overrides` を更新して backend を再デプロイする。

### 5. 動作確認

```bash
# Function URL を取得
FUNCTION_URL=$(aws cloudformation describe-stacks \
  --stack-name "${ENV_NAME}-tasche-backend" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='BackendFunctionUrl'].OutputValue" \
  --output text)

curl -i "${FUNCTION_URL}health"
# 200 OK が返ればデプロイ成功
```

現在の dev 実装では Function URL が `AuthType: NONE` のため直接 `curl` で確認できる。最終的な疎通確認は CloudFront 経由の `https://<frontend-domain>/api/health` を優先する。

### 6. ロールバック手順

過去に deploy したいコミット / タグを checkout し、同じ URL 解決 → `sam build` → `sam deploy` を再実行する。

```bash
git checkout <ロールバック先のコミットまたはタグ>
cd packages/backend
eval "$(bash scripts/fetch-lambda-extensions.sh)"
cd infra
sam build \
  --config-env "$ENV_NAME" \
  --parameter-overrides \
    "SecretsLayerUrl=${SECRETS_LAYER_URL}" \
    "AdotLayerUrl=${ADOT_LAYER_URL}"
sam deploy \
  --config-env "$ENV_NAME" \
  --no-confirm-changeset
```

## Frontend (S3 + CloudFront) を手動デプロイする

### 1. 事前準備

```bash
git fetch --all --tags
git checkout <commit-or-tag>
pnpm install --frozen-lockfile
```

### 2. 事前確認: Backend が先にデプロイ済みであること

Frontend の CloudFront は Backend Function URL をオリジンに利用するため、先に backend スタックがデプロイされている必要がある。
Backend のデプロイ時に SSM パラメータ `/tasche/${ENV_NAME}/sam/backend-function-url` へホスト名が自動格納される。
Frontend テンプレートはこの SSM パラメータを直接参照するため、手動での URL 取得・加工は不要。

```bash
# SSM に格納済みか確認
aws ssm get-parameter \
  --name "/tasche/${ENV_NAME}/sam/backend-function-url" \
  --region "$AWS_REGION" \
  --query "Parameter.Value" --output text
```

### 3. ビルド

```bash
cd packages/frontend
pnpm build:dev          # dev 向け (内部で vite build --mode dev)
# pnpm build:prod         # prod 向け
# dist/ に静的アセットが生成される
```

ビルド時にバンドルへ焼き込まれる `VITE_*` 環境変数は、ローカルの `.env` ではなくコミット済みの `.env.dev` / `.env.prod` から読まれる (Vite の env 優先度: `.env.[mode].local` > `.env.[mode]` > `.env.local` > `.env`)。
これによりローカルの `VITE_USE_MSW=true` や localhost 用 OAuth 設定が dev/prod デプロイ用バンドルに混入することはない。

> ⚠️ 個人で `packages/frontend/.env.dev.local` を作ると `.env.dev` を上書きしてしまうので、デプロイ用 mode 名 (`dev` / `prod`) で `.local` 版は作らないこと。

### 4. SAM デプロイ (S3 / CloudFront / OAC)

```bash
cd infra
sam deploy \
  --config-env "$ENV_NAME" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset
```

`BackendFunctionUrl` は `samconfig.toml` に SSM パスが定義済みのため、`--parameter-overrides` での指定は不要。
`/api/*` behavior は Lambda OAC `no-override` で backend Function URL に転送されるため、viewer の `Authorization` ヘッダを落とさない前提で動作する。

### 5. アセットを S3 に同期

```bash
cd ../../..  # repo root
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "${ENV_NAME}-tasche-frontend" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" \
  --output text)
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "${ENV_NAME}-tasche-frontend" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

# ハッシュ付きの静的アセットは長期キャッシュ
aws s3 sync packages/frontend/dist/ "s3://$BUCKET/" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# HTML はキャッシュさせない (即時切替)
aws s3 sync packages/frontend/dist/ "s3://$BUCKET/" \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html"
```

### 6. CloudFront キャッシュ無効化

```bash
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/index.html" "/"
```

### 7. 動作確認

```bash
DOMAIN=$(aws ssm get-parameter \
  --name "/tasche/${ENV_NAME}/frontend/domain" \
  --region "$AWS_REGION" \
  --query "Parameter.Value" --output text 2>/dev/null || true)

if [ -z "$DOMAIN" ]; then
  DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "${ENV_NAME}-tasche-frontend" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
    --output text)
fi

curl -I "https://$DOMAIN/"            # 200 OK + index.html
curl -I "https://$DOMAIN/api/health"  # 200 OK (CloudFront 経由で backend に届く)
```

### 8. ロールバック手順

S3 はバージョニングを有効化していないので、過去のコミットを再ビルド & 再 sync する形でロールバックする。

```bash
git checkout <ロールバック先のコミット>
pnpm install --frozen-lockfile
cd packages/frontend && pnpm build:dev && cd ../..
# 上記「5. アセットを S3 に同期」「6. CloudFront キャッシュ無効化」を再実行
```

## 補足: 暫定運用

外部リポ側の SSM Parameter / IAM ロールが整備中で本ドキュメント通りに動かない場合の代替策:

- SAM テンプレート Parameters のデフォルト値を一時的にハードコードして `--parameter-overrides` で上書きする
- IAM ロールが未整備の場合は、ローカルの強い権限の AWS プロファイルから直接 `sam deploy` する (本番運用 NG、検証用途のみ)
