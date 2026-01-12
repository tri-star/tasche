# ADR002: Frontend deploy design (CloudFront + /api routing)

- Status: Accepted (living document)
- Date: 2026-01-12

## Context

Frontend は静的ファイルとして配信し、API は別のオリジン（API Gateway または Lambda Function URL）で提供する想定。
Frontend は Orval 生成の fetch クライアントが `/api/...` の相対パスでアクセスする。

開発環境:

- Vite dev server の proxy で `/api` を backend へ転送（CORS 回避）

本番環境:

- CloudFront を前段に置き、`/api/*` を API オリジンへ、`/*` を静的配信オリジンへ振り分ける

## Decision

### 1) CloudFront でのパスルーティング

CloudFront の Behavior を分ける:

- `Default (*)` → Static origin（S3 等）
- `/api/*` → API origin（API Gateway / Lambda Function URL）

これによりブラウザ視点のオリジンは CloudFront に統一され、Frontend コードは `/api` を叩くだけでよい。

### 2) API のキャッシュ方針（/api/\*）

基本方針:

- `/api/*` は **原則キャッシュしない**（TTL=0 相当）

理由:

- ユーザー/認証状態でレスポンスが変わる可能性が高い
- 意図しないキャッシュが重大事故になりやすい

例外:

- 公開で不変・低頻度更新のエンドポイントに限り、別 Behavior や Cache Policy でキャッシュを検討する

### 3) Forward すべきヘッダ/クッキー（/api/\*）

認証方式に依存するが、少なくとも以下を検討する:

- `Authorization` ヘッダを origin へ forward
- Cookie ベース認証なら Cookie を origin へ forward（必要最小限）
- `Host`/`X-Forwarded-*` 系の取り扱い

注意:

- Forward する値が多いほどキャッシュキーが複雑化し、性能/コストに影響する
- 「キャッシュしない」設計ならキャッシュキーを過剰に作る必要は薄いが、転送の可否は必要

### 4) CORS / Same-Origin

推奨:

- 本番は CloudFront（同一オリジン）経由で `/api/*` を呼ぶ設計に寄せる

理由:

- ブラウザでの CORS 設定やプレフライトを最小化できる

注意:

- 直接 API オリジン（API Gateway/Lambda URL）を叩く経路を残すなら、その場合の CORS を別途設計する

### 5) SPA ルーティング（将来ページ実装時）

必要になったら実施:

- `/*` で存在しないパスは `index.html` にフォールバックする設定
  - CloudFront Functions / Lambda@Edge / S3 website endpoint 設定等の選択肢がある

※ `/api/*` はフォールバック対象にしない

### 6) セキュリティヘッダ（静的配信側）

CloudFront Response Headers Policy 等で検討:

- `Content-Security-Policy`（導入は段階的に）
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

### 7) MSW の本番禁止

Frontend 側の方針:

- 本番では MSW は起動しない
- `VITE_USE_MSW=false` のビルドでは `public/mockServiceWorker.js` を生成/配置しない

理由:

- 本番挙動をモックに依存させない
- 意図しない interception を避ける

## Implementation notes

- 開発時の `/api` プロキシのターゲットは `VITE_API_BASE_URL`（未指定時は `http://localhost:8000`）
- 本番は CloudFront 側で `/api/*` を API origin に流すため、クライアントコードは `/api/...` の相対パスのままで良い

## Open Questions / To be refined

- 認証方式（Bearer token / Cookie）と、CloudFront の forward 設計（Cookie/Authorization/ヘッダ）
- `/api/*` のログ/トレース（CloudFront logs、APIGW access logs、相関 ID の付与）
- エラーレスポンス/メンテナンス時の挙動（API 障害時の UX、CloudFront error responses）
- インバリデーション戦略（静的アセット更新時）
- API の将来的なキャッシュ最適化（public endpoint のみ）
