# SSM Parameter Store 命名規約

## 目的

Tasche のデプロイにおいて、IAM ロール ARN や SecretsManager の ARN といった「外部リポジトリで管理するリソースの識別子」を、本リポジトリの SAM テンプレート / GitHub Actions が参照できる形で受け渡すための命名規約を定める。

参考: TCH-19 デプロイパイプライン構築（`docs/work-logs/20260508-deploy-pipeline/plan.md`）

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
| `/tasche/<env>/iam/lambda-execution-role-arn` | Backend Lambda の実行ロール ARN。SecretsManager 取得・CloudWatch Logs・X-Ray の権限を含む。 | backend SAM (`packages/backend/infra/template.yaml`) |
| `/tasche/<env>/iam/github-deploy-role-arn` | GitHub Actions が OIDC で AssumeRole する ARN。CloudFormation/SAM 操作・ECR push・S3 sync の権限を含む。 | GitHub Actions workflow (実体は GitHub Variables 経由でも可) |

### SecretsManager (外部リポジトリで作成・管理)

機密値そのものは SecretsManager に格納し、以下のパスに **その ARN** を保存する。

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/secrets/db-url-arn` | Neon PostgreSQL の接続 URL を保持する Secret の ARN。Secret 値は plain string で `postgresql+asyncpg://...` 形式を想定。 | backend (Parameters and Secrets Lambda Extension 経由で取得) |
| `/tasche/<env>/secrets/jwt-secret-arn` | 自前発行 JWT の署名鍵を保持する Secret の ARN。Secret 値は plain string。 | backend (同上) |
| `/tasche/<env>/secrets/google-oauth-arn` | Google OAuth の Client ID と Client Secret を保持する Secret の ARN。Secret 値は JSON 形式 `{"client_id": "...", "client_secret": "..."}`。 | backend (同上) |

### Frontend 配信関連

| パス | 内容 | 利用先 |
|---|---|---|
| `/tasche/<env>/frontend/domain` | CloudFront に割り当てる独自ドメイン名 (例: `dev.tasche-app.com`) | frontend SAM |
| `/tasche/<env>/frontend/acm-certificate-arn` | CloudFront 用 ACM 証明書 ARN（**us-east-1 リージョン必須**） | frontend SAM |
| `/tasche/<env>/frontend/hosted-zone-id` | Route53 Hosted Zone ID（任意。Route53 レコードは外部リポ管理を想定） | frontend SAM (出力用) |

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
          DB_URL_SECRET_ARN: !Sub '{{resolve:ssm:/tasche/${Env}/secrets/db-url-arn}}'
```

### アプリケーションから（実行時取得）

Backend Lambda は AWS Parameters and Secrets Lambda Extension を有効化し、`http://localhost:2773/secretsmanager/get?secretId=<ARN>` 経由で値を取得する。詳細は `tasche/core/config.py` の実装を参照。

### GitHub Actions から

`aws ssm get-parameter --name /tasche/dev/...` で取得可能。ただし IAM ロール ARN のような workflow 自体の起動に必要な値は **GitHub Variables（`vars.AWS_DEPLOY_ROLE_ARN_DEV` 等）に複製**して保管することを推奨する（Parameter Store に取りに行く前段で AssumeRole が必要なため）。

## 暫定運用 (外部リポ実装完了前)

外部リポでの SSM パラメータ整備が完了するまでの間は、以下の暫定対応を許容する。

- SAM Parameter にデフォルト値（dummy ARN）を設定し、`sam deploy` 時に `--parameter-overrides` で具体値を上書きする。
- GitHub Actions の AssumeRole に必要なロール ARN は GitHub Variables に直接設定する。
- SSM パラメータが揃った時点で、SAM テンプレートの参照を `{{resolve:ssm:...}}` に切り替える。

## 外部リポジトリへの依頼事項

外部リポジトリで以下を作成・公開する必要がある。詳細は `tmp/plan/external-repo-requirements.md` を参照。

- 上記表のすべての SSM Parameter
- それらが指す IAM ロール / Secret / 証明書の実体
- `dev` 環境の整備が完了次第、本リポの dev デプロイ動作確認を実施
