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
- テストは `src/tasche/api/v1/tests/` と `src/tasche/tests/` の2箇所に分散している（TCH-59時点）

## モデル設計（TCH-32 で確認）

- `email_verified_at: Mapped[datetime | None]` が `User` モデルに追加された（`DateTime(timezone=True)` + `nullable=True`）
- SQLite テスト環境では naive datetime が返るため、datetime の比較アサーションは `is not None` の存在確認にとどめる（PostgreSQL との差異）
- Task モデルの ID は `tsk_` (4文字) + ULID (26文字) = 30文字。`String(30)` に格納

## プライベート関数の公開使用（TCH-59 で確認）

- `api/v1/tasks.py` の `get_tasks` エンドポイントが `task_service._normalize_pagination()` をアンダースコア付きのプライベート関数として直接呼んでいる
- `_normalize_pagination` は services モジュール内部のユーティリティであり、API 層から直接呼ぶ設計は理想的でない
- 修正方向: パブリック関数化するか、ページングパラメータのバリデーションを API 層の Query 制約に移す

## 未使用関数（TCH-59 で確認）

- `services/task.py` の `get_tasks_by_user()` が定義されているが、コードベース全体でどこからも呼ばれていない
- `get_tasks_with_stats()` が後継として存在しており、前者は削除候補

## テストファイルのシグネチャ不整合（TCH-59 で確認、TCH-61 でも継続）

- `test_tasks.py` の `_create_week()` ヘルパーが `start_date: datetime.date` と型注釈しているが、`datetime` モジュールの `date` 型を `datetime.date` と参照しており、`from datetime import date` がない場合は動作するが慣習と異なる
- TCH-61 でもこのパターンが残存（未修正）

## テストの DB 永続化検証パターン（TCH-15 で確認）

- `test_settings.py` が `await db_session.refresh(test_user)` してからモデルを直接アサートしている
- 「レスポンス JSON は正しいが DB は変わっていない」バグを検出できる優れたパターン
- 既存の `test_tasks.py` にはないパターン。今後の更新系テストでも採用を推奨する

## conftest.py の test_user フィクスチャに theme が未設定（TCH-15 で確認）

- `conftest.py` の `test_user` フィクスチャが `theme` フィールドを明示せず、SQLAlchemy `default="light"` に暗黙依存している
- `test_settings.py` のアサートが `theme == "light"` に依存しているため、モデルのデフォルト変更でテストが静かに壊れるリスクがある
- 修正方向: `test_user` フィクスチャに `theme="light"` を明示する

## CORS allow_methods に PATCH が欠落（TCH-15 のセキュリティレビューで確認）

- `main.py` の `allow_methods` が `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` で `PATCH` が含まれていない
- PATCH エンドポイント（settings など）がブラウザから実際には動作しないバグでもある
- 修正: `allow_methods` に `"PATCH"` を追加する

## 引数順序の混在（TCH-15 で確認）

- `api/v1/` 内のエンドポイントが `(payload, db, current_user)`, `(db, current_user, payload)`, `(payload, current_user, db)` の3パターン混在
- FastAPI では動作に影響しないが認知負荷になる。プロジェクト規約として統一を推奨

## services ファイルのロガー欠落（TCH-9 で再確認）

- `services/goal.py` は TCH-9 時点でも `import logging` / `logger = logging.getLogger(__name__)` が存在しない
- 他のサービスファイル（`week.py`, `auth.py` 等）はすべてロガーを宣言しているため、goal.py は例外的に欠落している
- `_fetch_previous_goals` のように複数の `None` 返却分岐がある非同期関数は、DEBUG ログがないと本番調査が困難になる

## テストヘルパの commit パターン（TCH-9 で確認）

- `test_goals.py` の `_add_goal` ヘルパが `await db_session.commit()` を毎回呼ぶ設計
- `conftest.py` の `db_session` が `expire_on_commit=False` のため実害はないが、テスト内トランザクションが複数に分断される
- 他テストファイルのパターンと一致しているか確認が必要。`flush()` に統一した方がシンプルという提案は可能

## conftest.py パターン（TCH-61 で再構築確認）

- テスト配置はコロケーション方式（`api/v1/tests/`, `core/tests/`, `services/tests/`, `tests/`）に移行済み
- `conftest.py` は `src/tasche/conftest.py` 1箇所に統合。旧 `tests/conftest.py` は削除済み
- DB ガード: モジュールロード時に `TEST_DATABASE_URL` の DB 名を `tasche_test` に制限する RuntimeError
- Alembic: `scope="session"` の `_apply_migrations` fixture で `settings.database_url` を一時的に差し替えて upgrade head を実行
- TRUNCATE: `_truncate_all_tables()` が各テスト前に実行（function スコープ）。テーブル名を pg_tables から動的取得して `TRUNCATE ... RESTART IDENTITY CASCADE` を実行（SQL インジェクションリスクは低いがシステムカタログ依存）
- `make_google_id_token()` は conftest の **通常関数**（fixture ではない）として定義。`test_auth.py` が `from tasche.conftest import make_google_id_token` で直接 import している
- `test_goals.py`, `test_records.py`, `test_dashboard.py` が conftest の `test_user` fixture を上書きするローカル `test_user` fixture を定義しており、ユーザーID `usr_01TEST1234567890ABCDEF` が各ファイルでハードコード重複
- `test_tasks.py` が conftest の `token_service` / `auth_headers` を上書きするローカル fixture を定義（TestTokenService 非依存の `_LocalTokenService` を使用）
- `asyncio_mode = "auto"` 設定済みのため `@pytest.mark.asyncio` デコレータは不要だが、`test_users.py` と `test_security.py` に冗長な `@pytest.mark.asyncio` が残存

## ライブラリ移行の既知状況（TCH-29 で確認）

- `joserfc` への移行は `core/oauth.py` + `services/auth.py` のみ完了。`core/security.py`・`core/test_auth.py`・`tests/helpers/google_oauth.py`・`core/tests/test_security.py` は依然 `from jose import ...`（python-jose）を使用している。
- `pyproject.toml` の `joserfc` バージョン制約が `>=1.0.0` だが `uv.lock` では `>=1.7.1` に固定されており乖離がある。
- `core/oauth.py` にモジュールレベルのロガーがない（他の core モジュールと異なる）。
- `oauth.py` の `verify_google_id_token` が `JoseError("email_not_verified")` というライブラリ内部例外を直接 raise している（アプリ例外に変換すべき）。
- `asyncio.Lock` によるキャッシュ競合防止は TCH-29 で実装済み（既存の JWKS キャッシュ競合問題が解消）。

**Why:** TCH-26 の Google OAuth 実装時に発見。今後のレビューでも同様のトランザクション管理・ログ欠落パターンを注意して見るべき。
**How to apply:** services 層の新しい関数をレビューするときはコミット境界を必ず確認。セキュリティ関連の分岐には INFO/WARNING ログが入っているか確認する。セキュリティ拒否分岐には必ず WARNING ログ（user_id, email, 試行元情報）を追加するよう指摘する。プライベート関数 (`_` 接頭辞) の API 層からの直接呼び出しパターンはレビュー時に毎回指摘する。新しい services 関数には必ず `logger = logging.getLogger(__name__)` と DEBUG ログ（更新成功時）があるか確認する。goal.py はロガーが欠落している既知の状態（TCH-9 時点未修正）なので、goal.py を触る実装では毎回ロガー追加を促す。`core/oauth.py` にもロガーが欠落しているため、この周辺を触る実装ではロガー追加を促す。
