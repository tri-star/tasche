# 手動デプロイ手順

通常の dev 環境デプロイは GitHub Actions の `release/<app>-dev/<version>` タグ push で実行されるが、CI の障害時や検証用途で **手元から手動デプロイ** したいケースがある。本ドキュメントは backend / frontend それぞれの手動デプロイ手順をまとめる。

関連ドキュメント:

- パイプライン全体像: `docs/work-logs/20260508-deploy-pipeline/plan.md`
- 命名規約: `docs/deploy/ssm-naming.md`
- 外部リポ依頼事項: `tmp/plan/external-repo-requirements.md`
- ADR: `docs/adr/ADR005-backend-lambda-packaging.md`, `docs/adr/ADR006-deploy-trigger-strategy.md`

## 前提

- AWS CLI v2 と SAM CLI v1.100+ がインストール済みであること
- Docker (buildx 対応) が動作すること (backend のみ)
- 必要に応じて pnpm 9, Node.js 22 (frontend のみ)
- AWS 認証情報がローカルから利用可能であること
  - 推奨: `aws configure sso` または GitHub Actions と同等の OIDC ロールを `aws sts assume-role` で取得
  - 必要権限: `tmp/plan/external-repo-requirements.md` の "1-1 GitHub Actions デプロイ用ロール" と同等
- 環境変数 (本ドキュメント全体で使用):

  ```bash
  export AWS_REGION=ap-southeast-1
  export ENV_NAME=dev
  export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ```

- 外部リポジトリ側のセットアップ (ECR, IAM, SecretsManager, ACM, SSM Parameter) が完了していること

## 共通の事前確認

```bash
# SSM パラメータが揃っているか確認
aws ssm get-parameters-by-path \
  --path "/tasche/${ENV_NAME}/" \
  --recursive \
  --region "$AWS_REGION" \
  --query "Parameters[].Name"

# ECR リポジトリが存在するか確認
aws ecr describe-repositories \
  --repository-names "tasche-backend-${ENV_NAME}" \
  --region "$AWS_REGION"
```

## Backend (Lambda コンテナイメージ) を手動デプロイする

### 1. リポジトリのチェックアウト & ブランチ確認

デプロイしたいコミット (通常は `main` か `release/backend-dev/<version>` タグ) を checkout する。

```bash
git fetch --all --tags
git checkout <commit-or-tag>
cd packages/backend
```

### 2. Lambda Extension Layer の取得 (コンテナイメージ焼き込み用)

```bash
bash scripts/fetch-lambda-extensions.sh
# build/lambda-extensions/ に layer の中身が展開される
```

### 3. ECR ログイン

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

### 4. コンテナイメージの build & push

```bash
IMAGE_TAG=$(git rev-parse --short HEAD)
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/tasche-backend-${ENV_NAME}:${IMAGE_TAG}"

docker build --platform linux/arm64 -t "$IMAGE_URI" .
docker push "$IMAGE_URI"
```

### 5. SAM デプロイ

```bash
cd infra
sam deploy \
  --config-env "$ENV_NAME" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "Env=${ENV_NAME} AppEnv=development LogLevel=info ImageUri=${IMAGE_URI}"
```

### 6. 動作確認

```bash
# Function URL を取得
FUNCTION_URL=$(aws cloudformation describe-stacks \
  --stack-name "tasche-backend-${ENV_NAME}" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='BackendFunctionUrl'].OutputValue" \
  --output text)

curl -i "${FUNCTION_URL}health"
# 200 OK が返ればデプロイ成功
```

### 7. ロールバック手順

過去に push 済みのイメージタグを指定して `sam deploy` を再実行する。

```bash
# ECR から過去イメージを確認
aws ecr describe-images \
  --repository-name "tasche-backend-${ENV_NAME}" \
  --region "$AWS_REGION" \
  --query "sort_by(imageDetails,&imagePushedAt)[*].[imageTags[0],imagePushedAt]" \
  --output table

# 任意のタグを ImageUri に指定して再デプロイ
PREV_TAG=<過去のタグ>
sam deploy \
  --config-env "$ENV_NAME" \
  --no-confirm-changeset \
  --parameter-overrides "Env=${ENV_NAME} AppEnv=development LogLevel=info ImageUri=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/tasche-backend-${ENV_NAME}:${PREV_TAG}"
```

## Frontend (S3 + CloudFront) を手動デプロイする

### 1. 事前準備

```bash
git fetch --all --tags
git checkout <commit-or-tag>
pnpm install --frozen-lockfile
```

### 2. Backend Function URL の取得

Frontend の CloudFront は Backend Function URL をオリジンに利用するため、先に backend スタックがデプロイされている必要がある。

```bash
FUNCTION_URL=$(aws cloudformation describe-stacks \
  --stack-name "tasche-backend-${ENV_NAME}" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='BackendFunctionUrl'].OutputValue" \
  --output text)
# https://xxx.lambda-url.ap-southeast-1.on.aws/ → xxx.lambda-url.ap-southeast-1.on.aws
BACKEND_HOST=$(echo "$FUNCTION_URL" | sed -E 's#^https?://##; s#/$##')
echo "$BACKEND_HOST"
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
  --no-fail-on-empty-changeset \
  --parameter-overrides "Env=${ENV_NAME} BackendFunctionUrl=${BACKEND_HOST}"
```

### 5. アセットを S3 に同期

```bash
cd ../../..  # repo root
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "tasche-frontend-${ENV_NAME}" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" \
  --output text)
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "tasche-frontend-${ENV_NAME}" \
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
  --query "Parameter.Value" --output text)

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
