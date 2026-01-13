# Tasche Frontend

Tascheのフロントエンドアプリケーションです。React + TypeScript + Viteで構築されています。

## 開発環境のセットアップ

### 1. 環境変数の設定

`.env.example`を`.env`にコピーして、必要に応じて値を調整してください。

```bash
cp .env.example .env
```

デフォルトでは、MSW (Mock Service Worker) が有効になっています。実際のバックエンドAPIを使用する場合は、`.env`ファイルで`VITE_USE_MSW=false`に設定してください。

### 2. 依存関係のインストール

プロジェクトルートから以下のコマンドを実行してください。

```bash
pnpm install
```

### 3. 開発サーバーの起動

```bash
pnpm --filter frontend dev
```

ブラウザで http://localhost:5173 にアクセスしてください。

## 利用可能なスクリプト

- `pnpm dev` - 開発サーバーを起動
- `pnpm build` - プロダクションビルドを作成
- `pnpm preview` - ビルドしたアプリケーションをプレビュー
- `pnpm test` - テストを実行
- `pnpm lint` - コードをチェック
- `pnpm format` - コードをフォーマット
- `pnpm openapi:update` - OpenAPI定義からAPIクライアントを生成

## 環境変数

### VITE_USE_MSW

MSW (Mock Service Worker) を有効にするかどうかを設定します。

- `true`: MSWを有効にして、モックAPIを使用
- `false`: 実際のバックエンドAPIを使用

開発環境では通常`true`に設定します。
