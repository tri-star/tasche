---
name: バックエンド アーキテクチャ規約
description: Tasche バックエンドの確立されたレイヤー規約・DI パターン・例外階層・命名規約
type: project
---

## レイヤー構成

```
api/v1/        - HTTP 入出力・Cookie 操作・Depends() のみ。ビジネスロジックは持たない
services/      - ビジネスロジック + SQLAlchemy 直接アクセス（Repository 層なし）
models/        - SQLAlchemy ORM モデル
schemas/       - Pydantic リクエスト/レスポンス スキーマ
core/          - 設定・JWT・OAuth クライアント・例外・環境フラグ
db/            - セッション管理
```

**Why:** MVP としてシンプルさを優先し Repository 層を省略（folder-structure.md に明記）。

## DI パターン（api/deps.py）

```python
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserSub = Annotated[str, Depends(get_current_user_sub)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

## 例外階層（core/exceptions.py）

TascheException
├── AuthenticationError
│   ├── InvalidTokenError
│   ├── TokenExpiredError
│   ├── InvalidRefreshTokenError
│   └── InvalidAuthorizationCodeError
├── UserNotFoundException
├── TaskNotFoundException
└── ValidationError

main.py で各例外を HTTP ステータスにマッピング。外部ライブラリ例外はサービス層で捕捉してドメイン例外に変換。

## API バージョニング

URL パス方式（/api/v1/...）。router.py で api_router.include_router() により集約。

## ID 命名規約

- User ID: `usr_` + ULID (String(30))
- Refresh Token ID: `rft_` + ULID (String(30))

## DB コミット規約（方針）

サービス関数の末尾でのみ commit。下位ユーティリティ関数（create_user など）は flush のみ行い commit しない。
※ 現状 create_user / update_user が commit しているのはレビュー指摘事項（要修正）。

## タスク API 固有パターン（TCH-59 で確認）

- `get_tasks_with_stats`: LEFT JOIN records + GROUP BY task.id + CASE/COALESCE で N+1 なし。COUNT は独立クエリ。
- ページネーション: `DEFAULT_PER_PAGE=20`, `MAX_PER_PAGE=100`, `_normalize_pagination` で異常値フォールバック。
- バルクアーカイブ: `archive_tasks` は IN クエリ 1 本 + ループ更新 + flush で原子性確保。router の `transaction(db)` でコミット。
- `_normalize_pagination` はアンダースコア付き private だが router が直接呼んでいる（レイヤー境界侵食の指摘事項）。
- `scalar_subquery()` の NULL 比較: 先週 Week 非存在時に CASE else_=0 で正しく動くが、`func.sum().filter()` を使うほうが意図明確。
- テスト: `src/tasche/api/v1/tests/test_tasks.py` が Integration Test（実 DB）として配置されている（folder-structure.md の `tests/api/` とは異なる場所）。

## 設定 API（TCH-15 で確認）

- サービス分割方針: 「プロフィール（name, picture, google_sub）は user サービス、ユーザー設定（timezone, theme）は setting サービス」
- `update_user_settings` は flush のみ・commit なし（「commit は呼び出し側責任」規約に準拠）
- timezone は IANA 検証あり。現状 `ValueError` を送出しているが、`ValidationError(TascheException)` への移行が推奨（未修正の指摘事項）
- theme カラムは `server_default="light"` 付きで安全なマイグレーション実施済み

## スタブ認証

- is_auth_stub_enabled(app_env, auth_stub_enabled) でゲート制御
- APP_ENV=production では強制 false
- スタブ JWT: stub=True クレーム + auth_stub_jwt_secret で署名
- スタブエンドポイント: モジュールロード時に条件登録（テスト時は env var で有効化が必要）
