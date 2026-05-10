# ADR001: Frontend env / tooling design

- Status: Accepted
- Date: 2026-01-12

## Context

このリポジトリに `packages/frontend` を新設し、バックエンド(OpenAPI)を元にした HTTP クライアント生成・モック生成を含むフロント開発基盤を整備する。

要件:

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Orval
  - OpenAPI 入力: `packages/backend/openapi.json`
  - `pnpm openapi:update` で HTTP クライアント自動生成
  - MSW モック(handlers)も生成
- Vitest
- Biome で lint/format
- Orval 生成物は Biome の検査対象外
- MSW は開発中は使うが、本番では一切使わない
  - 本番ビルド時(`VITE_USE_MSW=false`)は `public/mockServiceWorker.js` を生成/配置しない

## Decisions

### 1. Monorepo / package manager

- pnpm workspace を採用し、ルートに `pnpm-workspace.yaml` を置く。
- workspace は `packages/*` を含める。

理由:

- ルートから `pnpm -r` / `pnpm --filter` でパッケージ単位の実行を統一できる。

### 2. Lint / Format

- ルートに共通設定として `biome.json` を置く。
- `packages/frontend/biome.json` を置き、ルート設定を継承し、frontend 固有ルールを追加する。
  - 実装は `"extends": ["../../biome.json"]` を採用する（`"//"` はこの環境の Biome 解決で失敗した）。
- Orval 生成物 (`packages/frontend/src/api/generated/**`) は **format/lint ともに対象外** に固定する。

理由:

- 共通ルールの一元管理と、パッケージ固有の柔軟性を両立する。
- 生成コードに対してフォーマッタ/リンタを走らせると差分/ノイズ/崩れの原因になりやすい。

### 3. OpenAPI client + mocks generation

- Orval で fetch クライアントを生成する。
- 生成先は `packages/frontend/src/api/generated` に統一する。
- MSW ハンドラも Orval で生成し、テスト・開発で利用する。

理由:

- OpenAPI との同期を自動化し、型安全なクライアントを継続的に利用できる。

### 4. MSW usage policy (dev/test only)

#### 4.1 Environment variables

- `VITE_USE_MSW`（`true|false`）:
  - `true` の場合のみ、ブラウザ(開発)で MSW を起動する。
  - `false` の場合は MSW を起動しない。
- `VITE_MSW_UNHANDLED`（`error|bypass`、任意）:
  - MSW が起動している場合の未ハンドルリクエストの扱い。
  - 開発初期は `error` を推奨（漏れ検知）。移行期は `bypass`（実 API へ逃がす）。

補足:

- `VITE_API_BASE_URL`:
  - Vite 開発サーバの proxy 設定（`/api` → backend）で使用する backend の base URL（例: `http://localhost:8000`）。
  - 本番では Vite dev server が存在しないため、この proxy 用途の意味は無い（本番は別途リバースプロキシ等で同等のルーティングを行う）。

#### 4.2 Hybrid strategy without a dedicated env var

- `VITE_MSW_STRATEGY` は設けない。
- `VITE_USE_MSW=true` のとき、以下の方針で段階移行を実現する:
  - 「実 API に流したいエンドポイント（HTTP メソッド単位）」のみ **passthrough ハンドラ** を手書きで追加
  - 残りは Orval 生成の MSW モックが応答

理由:

- MSW は「先にマッチしたハンドラが勝つ」ため、passthrough を生成モックより優先するだけで段階移行ができる。
- 余計な戦略変数を増やさず、コード上でレビュー可能な形で移行が進められる。

#### 4.3 Production

- 本番では MSW を起動しない。
- `VITE_USE_MSW=false` のビルドでは `public/mockServiceWorker.js` を生成/配置しない。
  - 開発で使う場合のみ `msw init public/` を実行し、必要ならビルド前に削除する。

## Consequences

- 開発初期は MSW で全 API を隠蔽し、バックエンド完成に合わせて passthrough で実 API に切り替えられる。
- 本番は MSW コード/worker に依存しない運用が可能。
- 生成コードを Biome から除外するため、生成差分のノイズが減る。

## Open Questions

- Orval 生成物の具体的なファイル構成（`indexMockFiles` の生成形）に合わせて、手書きの handler 合成レイヤの import パスを確定する。
- `VITE_API_BASE_URL` 等の API base URL の扱い（プロキシ/環境差）をどこまで標準化するか。
