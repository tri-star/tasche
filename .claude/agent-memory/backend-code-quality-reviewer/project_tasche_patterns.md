---
name: tasche_project_patterns
description: Tasche バックエンドで発見したコーディング規約・アーキテクチャパターン・再発しやすい問題のまとめ
type: project
---

## プロジェクト構造

- `packages/backend/src/tasche/` がメインパッケージ
- レイヤー: `api/v1/` → `services/` → `models/` + `schemas/`
- リポジトリ層なし（services から SQLAlchemy を直接使用）
- テストは `packages/backend/tests/` だが TCH-26 時点でテストファイルが未作成

## コーディング規約

- 型ヒントは全関数・モデルフィールドに付与（`Mapped[]` スタイルの SQLAlchemy モデル）
- 関数ドキュメントは引数・戻り値・例外を記載する形式
- ID は ULID + プレフィックス形式（例: `usr_01...`, `rft_01...`）- String(30) に格納
- `rft_` (4文字) + ULID (26文字) = ちょうど30文字。String(30)はギリギリ

## 設定管理

- `pydantic-settings` の `Settings` クラス（`core/config.py`）
- `settings = Settings()` のモジュールレベルインスタンスを各モジュールがインポート
- `from tasche.core.config import settings` の遅延インポートが services/auth.py に存在するが、循環参照の根拠が不明（実際は不要の可能性が高い）

## スタブ認証パターン

- `core/env.py` の `is_auth_stub_enabled()` が引数ベースの純粋関数（テストしやすい）
- `APP_ENV=production` では `is_auth_stub_enabled()` が常に False
- スタブ JWT には `stub: True` クレームが必須（本番 JWT と区別）
- スタブエンドポイントはモジュールロード時の `if is_auth_stub_enabled(...)` ブロックで登録制御（テスト時は環境変数設定が必要）

## 再発しやすい問題

### トランザクション管理
- `services/user.py` の `create_user()` / `update_user()` が内部で `db.commit()` を呼んでいる
- `services/auth.py` の `handle_google_callback()` / `stub_login()` も末尾でコミット
- 結果: 1リクエストで最大2コミット発行 → ユーザー作成成功・トークン作成失敗で不整合が起きうる
- 修正方向: create/update 系は `flush()` のみにして、コミットは呼び出し元に一元化

### JWKS キャッシュの非同期競合
- `core/oauth.py` のグローバル変数 `_jwks_cache` が `asyncio.Lock` なし
- 高トラフィック時に thundering herd が発生
- 修正: `asyncio.Lock` + double-checked locking

### 例外の過剰な汎化
- `except Exception` で Google トークン交換エラーを一括捕捉
- ネットワーク障害（`httpx.RequestError`）も 400 として返してしまう

### セキュリティインシデントのログ欠落
- Refresh Token 再利用検知時（`rotate_refresh_token`）に WARNING ログが出ていない
- 正常系（ログイン成功・ローテーション成功・revoke）の INFO ログも未実装

## テスト方針（プロジェクトの方針）

- Integration Test 重視（実 DB を使用）
- モック/スタブを最小化
- E2E では環境変数 `AUTH_STUB_ENABLED=true` でスタブ認証を使用

## DRY 違反の既知箇所

- `REFRESH_TOKEN_MAX_AGE = 604800` (cookies.py) と `jwt_refresh_token_expires_seconds = 604800` (config.py) が二重管理

## 例外型の流用パターン

- `InvalidAuthorizationCodeError` は「Google 認可コード交換失敗・ID Token 検証失敗」の意味で定義されているが、TCH-32 で「未検証ユーザーへの自動紐付け拒否」にも流用されている
- `exceptions.py` のコメントには「Google OAuth エラー、ID Token 検証失敗など」とあるが、実際はより広い範囲で使われている
- 将来的にフロントエンドでエラーコードを区別したい場合は専用例外が必要になる可能性がある

## テスト方針の補足（TCH-32 で確認）

- `tests/services/` に置かれているテストも実 DB（SQLite in-memory）を使う統合テストである（docstring に「ユニットテスト」と書かれていても）
- テストケース番号のコメント（`# ケース1`、`# ケース2` 等）を使う慣習があるが、欠番が生じる場合がある → レビュー時に指摘する
- `conftest.py` の `db_session` フィクスチャは function スコープで毎テスト後に drop_all + engine dispose するクリーンな設計

## モデル設計（TCH-32 で確認）

- `email_verified_at: Mapped[datetime | None]` が `User` モデルに追加された（`DateTime(timezone=True)` + `nullable=True`）
- SQLite テスト環境では naive datetime が返るため、datetime の比較アサーションは `is not None` の存在確認にとどめる（PostgreSQL との差異）

**Why:** TCH-26 の Google OAuth 実装時に発見。今後のレビューでも同様のトランザクション管理・ログ欠落パターンを注意して見るべき。
**How to apply:** services 層の新しい関数をレビューするときはコミット境界を必ず確認。セキュリティ関連の分岐には INFO/WARNING ログが入っているか確認する。セキュリティ拒否分岐には必ず WARNING ログ（user_id, email, 試行元情報）を追加するよう指摘する。
