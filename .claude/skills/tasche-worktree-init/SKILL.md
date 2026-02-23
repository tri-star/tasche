---
name: tasche-worktree-init
description: "Tascheプロジェクトでgit worktreeを使った並行開発を始める際に、新しいworktreeの開発環境を効率よく初期化するスキル。「worktreeを初期化して」「開発環境をセットアップして」「新しいworktreeで作業を始めたい」などのリクエストがあった場合に積極的に使用すること。ポート番号の自動決定、.envファイルの生成、Docker/DB/pnpmの初期化を一括で行う。"
user-invokable: true
argument-hint: "(任意) プロジェクト名 - 省略時はブランチ名から自動生成"
---

# Tasche Worktree 初期化スキル

## 概要

git worktreeを使って並行開発を行う際、各worktreeが独立した開発環境（ポート番号、
Docker Composeプロジェクト名など）を持てるように自動初期化するスキルです。

## 前提条件

### .env.example のプレースホルダ形式

このスキルは、`.env.example` ファイルが `{%変数名%}` 形式のプレースホルダを
持っていることを前提としています。

**packages/backend/.env.example の例:**
```
COMPOSE_PROJECT_NAME={%COMPOSE_PROJECT_NAME%}
DB_CONTAINER_PORT={%DB_CONTAINER_PORT%}
API_CONTAINER_PORT={%API_CONTAINER_PORT%}

# Database
DATABASE_URL=postgresql+asyncpg://tasche:tasche_dev_password@localhost:{%DB_CONTAINER_PORT%}/tasche
...
```

**packages/frontend/.env.example の例:**
```
VITE_DEV_PORT={%VITE_DEV_PORT%}
VITE_API_BASE_URL=http://localhost:{%API_CONTAINER_PORT%}
VITE_USE_MSW=true
```

> **注意:** 初めてこのスキルを使う場合、`.env.example` にプレースホルダが
> 追加されているか確認してください。未対応の場合はまずプレースホルダを追加する必要があります。

## ポート番号の体系

各worktreeには仮想的な `PROJECT_INDEX`（0, 1, 2, ...）が割り当てられ、
そこからポート番号が自動計算されます。

| PROJECT_INDEX | API_PORT (API_CONTAINER_PORT) | DB_PORT (DB_CONTAINER_PORT) | VITE_DEV_PORT |
|:---:|:---:|:---:|:---:|
| 0 | 10000 | 10001 | 10002 |
| 1 | 10100 | 10101 | 10102 |
| 2 | 10200 | 10201 | 10202 |
| N | 10000 + N×100 | 10001 + N×100 | 10002 + N×100 |

## スキルの実行手順

スクリプトは全てプロジェクトルート（`packages/` が存在するディレクトリ）をカレントディレクトリとして実行します。
スキルディレクトリへのパスは環境変数 `SKILL_DIR` として保持して使いまわします。

```bash
SKILL_DIR="/home/tristar/projects/tasche/.claude/skills/tasche-worktree-init"
```

### ステップ1: 使用可能なPROJECT_INDEXを取得

```bash
PROJECT_INDEX=$(bash "$SKILL_DIR/scripts/detect-port-index.sh")
if [ $? -ne 0 ]; then
  echo "エラー: 使用可能なポートが見つかりません"
  exit 1
fi
echo "使用するPROJECT_INDEX: $PROJECT_INDEX"
```

`detect-port-index.sh` はlsofを使って上記のポートセットが全て空いているか確認し、
空いているPROJECT_INDEXを標準出力に返します。

### ステップ2: Docker ComposeのプロジェクトIDを決定

現在のgitブランチ名からプロジェクト名を決定します：

```bash
BRANCH=$(git branch --show-current)
```

**プロジェクト名の決定ルール:**
- ブランチ名に課題ID（`TCH-123` 形式）が含まれる場合 → 課題IDをそのまま使用
  - 例: `feature/TCH-123-add-task` → `TCH-123`
- 課題IDがない場合 → `feature/` プレフィックスを除いたブランチ名（長い場合は省略）
  - 例: `feature/awesome-feature` → `awesome-feature`
  - 例: `feature/very-long-feature-name-that-is-too-long` → `very-long-feat`
- どちらにも当てはまらない場合 → `tasche-{PROJECT_INDEX}`

プロジェクト名はDocker Composeのコンテナ名に使われるため、
英数字とハイフンのみ使用可能（大文字は小文字に変換）です。

### ステップ3: .envファイルの作成

```bash
bash "$SKILL_DIR/scripts/create-env-file.sh" -i "$PROJECT_INDEX" -n "$PROJECT_NAME"
```

このスクリプトは以下の2ファイルを生成します：
- `packages/backend/.env`
- `packages/frontend/.env`

### ステップ4: プロジェクトの初期化

```bash
bash "$SKILL_DIR/scripts/init-project.sh"
```

このスクリプトはbackendとfrontendの開発環境を初期化します：
- Docker Composeコンテナの起動
- Alembicによるデータベースマイグレーション
- シードデータの投入
- pnpm installの実行

## スクリプトの場所と実行方法

このSKILL.mdと同じディレクトリの `scripts/` サブディレクトリにスクリプトが入っています。

| スクリプト | 説明 |
|---|---|
| `scripts/detect-port-index.sh` | ポートの空き状況を確認し、PROJECT_INDEXを返す |
| `scripts/create-env-file.sh` | PROJECT_INDEXとプロジェクト名から.envを生成 |
| `scripts/init-project.sh` | Docker/DB/pnpmの初期化を一括実行 |

スクリプトを実行する際は、**プロジェクトルートをカレントディレクトリ**として
スキルのスクリプトへの完全パスを指定します。例：

```bash
SKILL_DIR="/home/tristar/projects/tasche/.claude/skills/tasche-worktree-init"
# プロジェクトルートに cd してからスクリプトを実行
cd /path/to/project/root
PROJECT_INDEX=$(bash "$SKILL_DIR/scripts/detect-port-index.sh")
bash "$SKILL_DIR/scripts/create-env-file.sh" -i "$PROJECT_INDEX" -n "$PROJECT_NAME"
bash "$SKILL_DIR/scripts/init-project.sh"
```

> スキルが worktree 環境で使われることを想定して、スキルディレクトリへのパスは
> `/home/tristar/projects/tasche/.claude/skills/tasche-worktree-init` で固定です。
> スキルが別の場所に移動した場合はこのパスを更新してください。

## トラブルシューティング

### ポートが見つからない場合

`detect-port-index.sh` が失敗する場合、全てのポート帯域が使用中です。
不要なDockerコンテナが起動していないか確認してください：

```bash
docker ps
```

### .envが正しく生成されない場合

`.env.example` にプレースホルダが含まれているか確認してください：

```bash
grep '{%' packages/backend/.env.example
grep '{%' packages/frontend/.env.example
```
