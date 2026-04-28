# ADR-004: E2E 実APIテストは専用 backend と専用 DB を利用する

## 日付

2026-04-29

## コンテキスト

TCH-31 では、E2E テストが通常のローカル開発 DB を利用していることが課題になった。
ローカル開発 DB には開発者や AI エージェントが任意のデータを投入するため、E2E テストの前提データと衝突し、失敗原因になり得る。

また、E2E 実行時だけ通常の backend コンテナの `DATABASE_URL` を切り替える方式では、テスト中断や操作ミスにより backend がテスト DB を向いたままになるリスクがある。
通常のローカル開発環境を壊さず、`pnpm test:e2e` の実行だけで DB reset と seed が完了する仕組みが必要だった。

## 決定

E2E 実APIテストでは、通常開発用 `api` コンテナとは別に `api-e2e` コンテナを起動する。

- 通常開発用 `api` は `tasche` DB を利用する。
- E2E 専用 `api-e2e` は `tasche_test` DB を利用する。
- `pnpm test:e2e` は `api-e2e` の起動、Alembic migration、DB reset、seed、Playwright 実行を一括で行う。
- E2E 終了後、`api-e2e` は停止する。
- DB reset スクリプトは `DATABASE_URL` の DB 名が `tasche_test` でない場合に失敗する。
- worktree ごとのポート衝突を避けるため、`scripts/initialize-dotenv.sh` で `E2E_API_CONTAINER_PORT` と `E2E_API_BASE_URL` を生成する。

## 検討した選択肢

### 選択肢1: E2E 用 backend コンテナを別に立ち上げる

- **概要**: `api` とは別に `api-e2e` を起動し、E2E は `tasche_test` に接続する。
- **メリット**: 通常開発環境を切り替えないため、テスト中断時もローカル開発 DB に影響しにくい。`pnpm test:e2e` に準備処理を集約できる。
- **デメリット**: compose サービスと E2E 用ポートが増える。

### 選択肢2: 通常 backend コンテナを testing 環境で起動し直す

- **概要**: `pnpm test:e2e` 内で通常 `api` を停止し、`APP_ENV=testing` や `.env.testing` で DB 接続先を切り替えて再起動する。
- **メリット**: backend コンテナを増やさずに済む。
- **デメリット**: テスト失敗や中断時に通常 backend を戻す必要がある。戻し漏れによりローカル開発環境がテスト DB を向くリスクが残る。

### 選択肢3: E2E 用 compose スタックを完全に分ける

- **概要**: E2E 専用の DB コンテナと backend コンテナを別 compose ファイルで起動する。
- **メリット**: 隔離度が最も高い。
- **デメリット**: ローカル実行時のリソースと構成要素が増える。既存の `tasche_test` DB 作成導線を活かしにくい。

## 決定理由

通常のローカル開発環境に影響しないことを最優先した。
`api-e2e` を別コンテナにすることで、E2E 実行時に通常 `api` の DB 接続先を変更する必要がなくなる。

また、`pnpm test:e2e` に E2E backend 起動、migration、reset、seed を組み込むことで、開発者や AI エージェントが手順を見落として通常 DB を誤って reset するリスクを下げられる。
DB reset 側にも `tasche_test` 以外では失敗するガードを入れ、操作ミスを実装レベルで防止する。

## 影響

### ポジティブな影響

- `pnpm test:e2e` だけで E2E 用 DB 準備が完了する。
- 通常開発用 `api` と `tasche` DB に触れずに E2E を実行できる。
- AI エージェントが E2E 実行後に backend を戻し忘れるリスクを避けられる。
- E2E 終了後に `api-e2e` が停止するため、通常開発時にテスト用 backend を使い続けにくい。
- worktree ごとに E2E 用 API ポートも自動採番される。

### ネガティブな影響・トレードオフ

- backend compose に `api-e2e` サービスが増える。
- E2E 実行時に通常開発用とは別の backend プロセスが起動する。

### 移行・対応が必要な事項

- 既存 `.env` には `E2E_API_CONTAINER_PORT` と `E2E_API_BASE_URL` がない場合があるため、必要に応じて `scripts/initialize-dotenv.sh` を再実行する。
- CI は `api` ではなく `api-e2e` を起動し、migration/reset/seed も `api-e2e` で実行する。

## 関連情報

- TCH-31: E2EテストをローカルDBから分離した専用テストDBで実行する
- `packages/backend/compose.yaml`
- `packages/frontend/scripts/run-e2e-with-backend.mjs`
- `packages/backend/scripts/e2e_seed/reset.py`
