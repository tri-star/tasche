# 外部リポジトリへの依頼事項

本リポジトリのデプロイを機能させるために、インフラ管理用の外部リポジトリで整備が必要なリソースをまとめる。
SSM Parameter Store の命名規約は `docs/deploy/ssm-naming.md` を参照。

## dev 環境

dev 環境の整備は完了済み。

## prod 環境

以下を外部リポジトリで作成・公開する必要がある。

### IAM ロール

| リソース | 用途 | 備考 |
|---|---|---|
| Lambda 実行ロール | `prod-tasche-backend` スタックの Lambda が使用 | SSM `/tasche/prod/iam/lambda-execution-role-arn` に ARN を登録 |
| GitHub Actions デプロイロール | OIDC で AssumeRole して CloudFormation / ECR / S3 / CloudFront を操作 | ARN を GitHub `prod` environment の Variables `AWS_DEPLOY_ROLE_ARN_PROD` に設定 |

Lambda 実行ロールに必要な権限:
- Parameters and Secrets Lambda Extension 経由での SecretsManager `GetSecretValue`
- CloudWatch Logs への書き込み (`logs:CreateLogGroup` / `logs:CreateLogStream` / `logs:PutLogEvents`)
- AWS Distro for OpenTelemetry (ADOT) / Application Signals 向け: `CloudWatchLambdaApplicationSignalsExecutionRolePolicy` 相当
- X-Ray Active Tracing 向け: `xray:PutTraceSegments` / `xray:PutTelemetryRecords`

GitHub Actions デプロイロールに必要な権限:
- CloudFormation スタック操作 (Create / Update / Describe / Delete)
- ECR: push / pull / リポジトリ作成
- S3: バケット操作 + `s3:PutObject` / `s3:DeleteObject` / `s3:ListBucket` (frontend アセット同期用)
- CloudFront: `cloudfront:CreateInvalidation` / `cloudfront:GetDistribution`
- Lambda: `lambda:UpdateFunctionCode` / `lambda:UpdateFunctionConfiguration`
- SSM: `ssm:GetParameter` / `ssm:PutParameter`
- IAM: `iam:PassRole` (Lambda 実行ロールを CloudFormation に渡す)

### SecretsManager

| リソース | 用途 |
|---|---|
| prod 用アプリケーション Secret (JSON) | SSM `/tasche/prod/secrets/app-secret-arn` に ARN を登録 |

Secret の JSON 構造 (キーは固定):
```json
{
  "db_url": "postgresql+asyncpg://user:pass@host/db?sslmode=require",
  "jwt_secret": "<32文字以上のランダム値>",
  "google_oauth_client_id": "<Google Cloud Console で発行>",
  "google_oauth_client_secret": "<Google Cloud Console で発行>"
}
```

### ACM 証明書 (us-east-1)

| リソース | 用途 |
|---|---|
| `tasche.life` ドメイン用 ACM 証明書 (**us-east-1 必須**) | CloudFront カスタムドメイン用。ARN を SSM `/tasche/prod/frontend/acm-certificate-arn` に登録 |

### Route53

| リソース | 用途 |
|---|---|
| `tasche.life` のホストゾーン | Hosted Zone ID を SSM `/tasche/prod/frontend/hosted-zone-id` に登録 |

### SSM パラメータ一覧

外部リポで設定が必要な SSM パラメータ:

| パス | 内容 | タイプ |
|---|---|---|
| `/tasche/prod/iam/lambda-execution-role-arn` | Lambda 実行ロール ARN | String |
| `/tasche/prod/iam/github-deploy-role-arn` | GitHub Actions デプロイロール ARN (参照用; workflow は GitHub Variables から読む) | String |
| `/tasche/prod/secrets/app-secret-arn` | アプリケーション Secret の ARN | String |
| `/tasche/prod/frontend/acm-certificate-arn` | CloudFront 用 ACM 証明書 ARN (us-east-1) | String |
| `/tasche/prod/frontend/hosted-zone-id` | Route53 ホストゾーン ID | String |

### SAM スタックが自動で書き込むパラメータ (外部リポの作業不要)

| パス | 内容 | タイミング |
|---|---|---|
| `/tasche/prod/sam/backend-function-url` | backend Lambda Function URL (ホスト名のみ) | `prod-tasche-backend` スタックのデプロイ完了時に自動作成 |

## GitHub リポジトリ設定 (本リポジトリ側の作業)

外部リポジトリの作業ではないが、デプロイ前に本リポジトリの GitHub Settings で実施すること:

1. **`prod` environment を作成**
   - Settings → Environments → New environment → `prod`
2. **承認必須 (Required reviewers) を設定**
   - Deployment protection rules → Required reviewers に承認者を追加
3. **Variables に ARN を設定**
   - `AWS_DEPLOY_ROLE_ARN_PROD`: 外部リポで作成した GitHub Actions デプロイロールの ARN

## 初回デプロイ手順 (bootstrap)

prod CloudFront Distribution ID は frontend スタックを作成するまで存在しないため、
初回は以下の順序でデプロイする:

1. 外部リポで上記リソースをすべて整備
2. GitHub で `prod` environment の設定を完了
3. **frontend prod を先にデプロイ** (`release/frontend-prod/YYYY-MM-DD-1` タグを push)
4. デプロイ完了後、CloudFormation Outputs から `DistributionId` を取得:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name prod-tasche-frontend \
     --region ap-southeast-1 \
     --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
     --output text
   ```
5. 取得した ID を `packages/backend/infra/samconfig.toml` の prod セクション
   `CloudFrontDistributionId=REPLACE_WITH_PROD_CLOUDFRONT_DISTRIBUTION_ID` に設定してコミット
6. **backend prod をデプロイ** (`release/backend-prod/YYYY-MM-DD-1` タグを push)

2回目以降の通常デプロイは `docs/deploy/github-actions-tag-deploy.md` を参照。
