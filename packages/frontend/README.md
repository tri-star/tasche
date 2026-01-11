# @tasche/frontend

Tasche のフロントエンド（React + Vite）。

## 開発

- 依存関係: `pnpm install`
- 起動: `pnpm -C packages/frontend dev`

ローカルのバックエンド（Docker Compose）を起動している場合、`/api` を `http://localhost:8000` にプロキシします。

## コマンド

- `pnpm -C packages/frontend lint`
- `pnpm -C packages/frontend format:write`
- `pnpm -C packages/frontend typecheck`
