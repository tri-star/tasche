# 外部リポジトリ (IAM/Secrets 管理リポ) への依頼事項

このドキュメントは、Tasche のデプロイパイプライン (TCH-19) を機能させるために、
**Tasche リポジトリ外**で用意してもらう必要があるリソースを一覧化したものです。
本リポは「これらが SSM Parameter Store に命名規約に従って公開されている」前提で動きます。

関連: `docs/deploy/ssm-naming.md`, `docs/work-logs/20260508-deploy-pipeline/plan.md`

## 用意してもらうリソース

### 1. IAM ロール

#### 1-1. GitHub Actions デプロイ用ロール (OIDC)

GitHub Actions が AssumeRole するロール。**dev / prod 別に 2 本**用意。

- 信頼ポリシー: GitHub OIDC (`token.actions.githubusercontent.com`) からの sts:AssumeRoleWithWebIdentity を許可。Subject 条件で `repo:tri-star/tasche:ref:refs/tags/release/<app>-<env>/*` または `repo:tri-star/tasche:environment:<env>` に絞る。
- 必要権限 (dev):
  - CloudFormation: `cloudformation:*` (対象リソースは `tasche-*` スタックのみ)
  - SAM/CDK 依存: `iam:PassRole` (Lambda 実行ロール ARN を渡せる権限)
  - ECR: `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:Initiate*Upload`, `ecr:Upload*`, `ecr:Complete*Upload`, `ecr:CreateRepository` (リポジトリ名は `tasche-backend-*`)
  - Lambda: `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:UpdateFunctionConfiguration`
  - S3 (frontend): `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` (バケット名は `tasche-frontend-*`)
  - CloudFront: `cloudfront:CreateInvalidation`, `cloudfront:UpdateDistribution`
  - SSM Parameter 読み込み: `ssm:GetParameter`, `ssm:GetParameters` (パスは `/tasche/<env>/*`)

#### 1-2. Backend Lambda 実行ロール

Backend Lambda が SecretsManager / CloudWatch Logs にアクセスするためのロール。**dev / prod 別に 2 本**。

- 信頼ポリシー: `lambda.amazonaws.com`
- 必要権限:
  - CloudWatch Logs: 標準の `AWSLambdaBasicExecutionRole`
  - SecretsManager: `secretsmanager:GetSecretValue` (対象 Secret の ARN に絞る)
  - 将来 ADOT 導入時: `xray:PutTraceSegments`, `xray:PutTelemetryRecords`

### 2. SecretsManager Secret

費用削減のため、**dev / prod 別に各 1 本**の Secret に全機密値を JSON 形式でまとめる。

| Secret 名 (例) | 値の形式 | 内容 |
|---|---|---|
| `tasche/dev/app-secret` | JSON | Tasche アプリケーションが必要とする機密値一式 (下記キー構成) |

JSON 構造 (キー名は固定):

```json
{
  "db_url": "postgresql+asyncpg://user:pass@host/db?sslmode=require",
  "jwt_secret": "<32文字以上のランダム値>",
  "google_oauth_client_id": "<Google Cloud Console で発行>",
  "google_oauth_client_secret": "<Google Cloud Console で発行>"
}
```

### 3. ACM 証明書

- **us-east-1 リージョン**で発行 (CloudFront の制約)
- 対象ドメイン: `dev.tasche-app.com` (dev), prod 用は別タスクで決定
- DNS 検証完了済みの状態で渡す

### 4. Route53 ホストゾーン (任意)

- `tasche-app.com` のホストゾーン。
- 実際のレコード (`dev.tasche-app.com` → CloudFront) は外部リポ側で管理する想定。
- Hosted Zone ID を SSM に出力してもらえると、本リポ側でも参照可能 (現時点では使っていないが将来の拡張用)。

### 5. SSM Parameter Store への ARN 公開

上記 1〜4 で作成したリソースの ARN/値を、`docs/deploy/ssm-naming.md` の命名規約に従って SSM Parameter Store に格納してもらう。

**dev 環境用パラメータ一覧 (必須)**:

| パス | 値 |
|---|---|
| `/tasche/dev/iam/lambda-execution-role-arn` | 1-2 のロール ARN |
| `/tasche/dev/iam/github-deploy-role-arn` | 1-1 のロール ARN |
| `/tasche/dev/secrets/app-secret-arn` | 2 の `tasche/dev/app-secret` Secret の ARN |
| `/tasche/dev/frontend/domain` | `dev.tasche-app.com` |
| `/tasche/dev/frontend/acm-certificate-arn` | 3 の証明書 ARN (us-east-1) |

**任意 (将来拡張用)**:

| パス | 値 |
|---|---|
| `/tasche/dev/frontend/hosted-zone-id` | 4 の Hosted Zone ID |

### 6. GitHub リポジトリ側の設定

GitHub Actions が OIDC でロールを Assume するためには、本リポ (`tri-star/tasche`) 側で以下の設定が必要 (Tasche チームで実施):

- リポジトリ Variables:
  - `AWS_DEPLOY_ROLE_ARN_DEV`: 1-1 の dev 用ロール ARN (workflow 起動前に必要なので、SSM ではなく Variables に複製する)
- Environment `dev` / `prod` を作成 (環境ごとの protection rules を設定するため)

## 作業順序の推奨

1. ACM 証明書 (us-east-1) を発行・DNS 検証完了
2. IAM ロール 2 本 (dev) を作成
3. SecretsManager Secret 1 本 (dev) を作成し、JSON 形式で値一式を設定
4. SSM Parameter Store に上記の値を出力
5. Tasche チーム側で GitHub Variables `AWS_DEPLOY_ROLE_ARN_DEV` を設定
6. Tasche チーム側で `release/backend-dev/2026-05-08-1` のようなタグを切って動作確認

## 動作確認チェックリスト

- [ ] `aws ssm get-parameters-by-path --path /tasche/dev/ --recursive` で必要なパラメータが揃っている
- [ ] backend デプロイ後、Lambda Function URL に対し `curl https://<url>/health` で 200 OK
- [ ] frontend デプロイ後、`https://dev.tasche-app.com/` で SPA が表示される
- [ ] `https://dev.tasche-app.com/api/health` が backend に届く (CloudFront 経由)
- [ ] アプリログ (CloudWatch Logs `/aws/lambda/tasche-backend-dev`) で SecretsManager 取得が成功している

## 補足: 暫定運用

外部リポ側の整備が完了する前に Tasche 側で動作確認を急ぐ場合、以下の暫定対応が可能です。

- SAM Parameter にデフォルト値 (dummy ARN) を設定して `--parameter-overrides` で具体値を上書きする
- `SECRETS_BACKEND=env` のまま、Lambda 環境変数に直接 secret 値を設定する (本番運用 NG、検証用のみ)
