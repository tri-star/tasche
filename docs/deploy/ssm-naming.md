# SSM Parameter Store 命名規約

## 目的

Tasche のデプロイにおいて、IAM ロール ARN や SecretsManager の ARN といった「外部リポジトリで管理するリソースの識別子」を、本リポジトリの SAM テンプレート / GitHub Actions が参照できる形で受け渡すための命名規約を定める。

## 基本ルール

- すべてのパラメータは AWS Systems Manager Parameter Store（無料枠の Standard 階層を想定）に保存する。
- パスは `/tasche/<env>/<category>/<name>` の階層を取る。
  - `<env>`: `dev` / `prod`（将来 `staging` を追加する余地あり）
  - `<category>`: `iam` / `secrets` / `frontend` など、用途別の分類
  - `<name>`: ケバブケースで具体的な値の名前
- 値の型は原則 `String`。リスト型が必要になった場合のみ `StringList`。
- 暗号化が必要な値（API キー等）は **Parameter Store に直接置かず**、SecretsManager に置いた上で **その ARN だけを Parameter Store に保存** する。

## 想定パラメータ一覧

### IAM ロール (外部リポジトリで作成・管理)

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/iam/lambda-execution-role-arn` | Backend Lambda の実行ロール ARN。SecretsManager 取得・CloudWatch Logs・ADOT/Application Signals・Lambda active tracing の権限を含む。 | backend SAM (`packages/backend/infra/template.yaml`) |
| `/tasche/<env>/iam/github-deploy-role-arn` | GitHub Actions が OIDC で AssumeRole する ARN。CloudFormation/SAM 操作・ECR push・S3 sync の権限を含む。 | GitHub Actions workflow (実体は GitHub Variables 経由でも可) |

### SecretsManager (外部リポジトリで作成・管理)

費用削減のため、Tasche 全体で **1 環境あたり 1 本** の Secret に複数キーを JSON 形式でまとめる設計とする。

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/secrets/app-secret-arn` | Tasche アプリケーションが必要とする全機密値を 1 本にまとめた Secret の ARN | backend (Parameters and Secrets Lambda Extension 経由で取得) |

Secret 値の JSON 構造 (キーは固定):

```json
{
  "db_url": "postgresql+asyncpg://user:pass@host/db?sslmode=require",
  "jwt_secret": "<32文字以上のランダム値>",
  "google_oauth_client_id": "<Google Cloud Console で発行>",
  "google_oauth_client_secret": "<Google Cloud Console で発行>"
}
```

新しいキーを追加する場合は、本リポの `tasche/core/config.py` の `resolve_secrets_from_extension` を更新する。

### ECR リポジトリ (SAM CLI 管理)

Backend の ECR リポジトリは外部リポジトリでは管理せず、`sam deploy --resolve-image-repos` で SAM CLI に自動作成させる。したがって、ECR 用の SSM Parameter は不要。

### Frontend 配信関連

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/frontend/domain` | CloudFront に割り当てる独自ドメイン名 (例: `dev.tasche-app.com`) | frontend SAM |
| `/tasche/<env>/frontend/acm-certificate-arn` | CloudFront 用 ACM 証明書 ARN（**us-east-1 リージョン必須**） | frontend SAM |
| `/tasche/<env>/frontend/hosted-zone-id` | Route53 Hosted Zone ID（任意。Route53 レコードは外部リポ管理を想定） | frontend SAM (出力用) |

### SAM スタックが自動で書き込むパラメータ

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/sam/backend-function-url` | backend stack が出力する Lambda Function URL のホスト名（`https://` と末尾 `/` を除いた値） | frontend SAM (`packages/frontend/infra/template.yaml`) |

## 参照方法

### SAM テンプレートから

CloudFormation Dynamic Reference を利用する。

```yaml
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]

Resources:
  Function:
    Type: AWS::Serverless::Function
    Properties:
      Role: !Sub '{{resolve:ssm:/tasche/${Env}/iam/lambda-execution-role-arn}}'
      Environment:
        Variables:
          APP_SECRET_ARN: !Sub '{{resolve:ssm:/tasche/${Env}/secrets/app-secret-arn}}'
```

### アプリケーションから（実行時取得）

Backend Lambda は AWS Parameters and Secrets Lambda Extension を **コンテナイメージに焼き込んで** 有効化し、`http://localhost:2773/secretsmanager/get?secretId=<ARN>` 経由で値を取得する。Layer の取り込みは `packages/backend/scripts/fetch-lambda-extensions.sh` と `Dockerfile` を参照。詳細は `tasche/core/config.py` の実装を参照。

### ADOT / Application Signals

Backend Lambda は AWS 環境でのみ ADOT / OpenTelemetry を有効化する。コンテナイメージ Lambda では通常の Lambda Layer アタッチではなく、`packages/backend/scripts/fetch-lambda-extensions.sh` で AWS Distro for OpenTelemetry Python Lambda layer を取得し、`packages/backend/Dockerfile` で `/opt` 配下に焼き込む。

外部リポジトリで管理する Lambda 実行ロールには、少なくとも AWS 管理ポリシー `CloudWatchLambdaApplicationSignalsExecutionRolePolicy` 相当の権限を付与する。SAM template 側で `Tracing: Active` を有効化するため、Lambda service traces に必要な X-Ray 書き込み権限も必要になる。X-Ray SDK / X-Ray daemon は利用しない。

現在の frontend template は CloudFront の Lambda OAC に `SigningBehavior: no-override` を設定しており、viewer の `Authorization` ヘッダを backend origin へそのまま転送する。backend Function URL 自体は dev 環境で一時的に `AuthType: NONE` になっているが、これはトラブルシュート用の暫定状態である。

### GitHub Actions から

`aws ssm get-parameter --name /tasche/dev/...` で取得可能。ただし IAM ロール ARN のような workflow 自体の起動に必要な値は GitHub Variables に複製して保管することを推奨する（Parameter Store に取りに行く前段で AssumeRole が必要なため）。

現状の workflow 実装では参照する Variable 名が統一されていない。

- backend: `vars.AWS_DEPLOY_ROLE_ARN`
- frontend: `vars.AWS_DEPLOY_ROLE_ARN_DEV`

## 暫定運用 (外部リポ実装完了前)

外部リポでの SSM パラメータ整備が完了するまでの間は、以下の暫定対応を許容する。

- SAM Parameter にデフォルト値（dummy ARN）を設定し、`sam deploy` 時に `--parameter-overrides` で具体値を上書きする。
- GitHub Actions の AssumeRole に必要なロール ARN は GitHub Variables に直接設定する。
- SSM パラメータが揃った時点で、SAM テンプレートの参照を `{{resolve:ssm:...}}` に切り替える。

## 外部リポジトリへの依頼事項

外部リポジトリで以下を作成・公開する必要がある。

- 上記表のすべての SSM Parameter
- それらが指す IAM ロール / Secret / 証明書の実体
- backend デプロイ後に `/tasche/<env>/sam/backend-function-url` が自動作成されることの確認
- `dev` 環境の整備が完了次第、本リポの dev デプロイ動作確認を実施
