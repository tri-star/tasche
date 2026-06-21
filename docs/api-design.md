# Tasche API 基本設計書

## 概要

本ドキュメントは、Tasche MVP の Backend API 設計を定義します。

### 基本仕様

| 項目 | 仕様 |
|------|------|
| ベースURL | `/api` |
| 認証方式 | サーバ側セッション（HttpOnly Cookie `session`、SameSite=Lax、Path=/api） |
| データ形式 | JSON |
| 文字コード | UTF-8 |

### 認証

認証が必要な API では、ブラウザが自動送信する HttpOnly Cookie でセッションを識別します。
フロントエンドは `credentials: "include"` を指定するだけでよく、Authorization ヘッダは不要です。

```
Cookie: session=<opaque-token>
```

### セッション管理方式

SPAのセキュリティを考慮し、サーバ側セッション方式を採用します：

| 項目 | 説明 |
|------|------|
| セッショントークン | 不透明トークン（`secrets.token_urlsafe(48)` 生成）。DB には SHA-256 ハッシュ値のみ保存 |
| Cookie 名 | `session` |
| 保存場所 | HttpOnly Cookie（JS からアクセス不可）/ サーバ側 DB（sessions テーブル） |
| スライディング延長 | 残存時間 < 有効期限の半分（デフォルト 3.5 日）の時点で `expires_at` を更新し `Set-Cookie` を再送 |

**Cookie 設定（セッション Cookie）:**
```
Set-Cookie: session=<opaque-token>; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=604800
```

| 属性 | 値 | 説明 |
|------|------|------|
| HttpOnly | true | JavaScriptからアクセス不可 |
| Secure | 環境依存 | 本番環境: true（HTTPS時のみ送信） / ローカル・E2E等の開発環境: false |
| SameSite | Lax | OAuth リダイレクト時も Cookie を送信可能にする |
| Path | /api | `/api/*` への全リクエストに自動付与 |
| Max-Age | 604800 | 7日間有効（スライディング延長により更新される） |

**Secure 属性の切り替え**: `COOKIE_SECURE` 環境変数で制御。ローカル開発と E2E テスト環境では `false`、本番環境では `true` とする。

### CSRF 対策

`CSRFMiddleware` が POST/PUT/PATCH/DELETE リクエストの Origin/Referer ヘッダを `CORS_ALLOW_ORIGINS` と照合します。

- Origin ヘッダがある場合: `CORS_ALLOW_ORIGINS` リストと照合
- Origin がなく Referer がある場合: Referer のオリジン部を抽出して照合
- どちらも存在しない場合: 許可（非ブラウザ API クライアントへの配慮）
- 不一致: `403 CSRF_VALIDATION_FAILED`

### 共通レスポンス形式

#### 成功時
```json
{
  "data": { ... }
}
```

#### エラー時
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 共通HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース未発見 |
| 500 | サーバーエラー |

---

## API一覧

| カテゴリ | メソッド | エンドポイント | 認証 | 説明 |
|----------|----------|----------------|------|------|
| 認証 | GET  | /api/auth/google/authorize | 不要 | Google 認可URLを生成して返却（state/PKCE付き） |
| 認証 | POST | /api/auth/google/callback | 不要 | Google 認可コードの交換・セッション発行 |
| 認証 | POST | /api/auth/logout | 不要（Cookie任意） | ログアウト（セッション revoke + Cookie クリア、冪等） |
| 認証 | POST | /api/auth/stub-login | 不要 | スタブ用ログイン（`AUTH_STUB_ENABLED=true` かつ非本番環境のみ有効） |
| ユーザー | GET | /api/users/me | 要 | 現在のユーザー情報取得 |
| タスク | GET | /api/tasks | 要 | タスク一覧取得（ページング対応） |
| タスク | POST | /api/tasks | 要 | タスク作成 |
| タスク | PUT | /api/tasks/{task_id} | 要 | タスク更新 |
| タスク | DELETE | /api/tasks | 要 | タスクバルクアーカイブ |
| タスク | DELETE | /api/tasks/{task_id} | 要 | タスク削除（アーカイブ） |
| 週 | GET | /api/weeks/current | 要 | 現在の週情報取得 |
| 週 | PUT | /api/weeks/current | 要 | 現在の週設定更新 |
| 目標 | GET | /api/weeks/current/goals | 要 | 今週の目標一覧取得 |
| 目標 | PUT | /api/weeks/current/goals | 要 | 今週の目標一括更新 |
| 実績 | GET | /api/weeks/current/records | 要 | 今週の実績一覧取得 |
| 実績 | POST | /api/weeks/current/records | 要 | 実績記録（互換エンドポイント） |
| 実績 | PUT | /api/weeks/current/records/{day_of_week}/{task_id} | 要 | 特定曜日・特定タスクの実績を保存/更新 |
| ダッシュボード | GET | /api/dashboard | 要 | ダッシュボード用データ取得 |

---

## 認証 API

本プロジェクトでは **BFF 型 Google OAuth 2.0 構成 + PKCE** を採用します。
フロントエンドが `code_verifier` を生成し、`code_challenge` を含む認可URLをリクエスト→Googleから受け取った `code` をバックエンドに送信→バックエンドが `code_verifier` と共に Google のトークンエンドポイントでトークン交換を行い、ID Token を検証してサーバ側セッションを発行します。セッショントークン（不透明トークン）は HttpOnly Cookie `session` で返却し、以降のリクエストではブラウザが自動送信します。Google の access/refresh トークンはバックエンド内にのみ保持し、フロントエンドには公開しません。

### GET /api/auth/google/authorize

Google OAuth 2.0 認可 URL を生成して返却します。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| code_challenge | string | Yes | PKCE の code_challenge（SHA256 + Base64URL） |
| code_challenge_method | string | No | `S256` 固定（省略時は `S256`） |
| redirect_uri | string | Yes | フロントエンドのコールバック URL |

#### レスポンス（200 OK）

```json
{
  "data": {
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+email+profile&state=...&code_challenge=...&code_challenge_method=S256",
    "state": "opaque_state_value"
  }
}
```

**注**:
- `state` は CSRF 対策としてフロントエンドで保持し、コールバック時に検証する
- `code_challenge` はフロントで生成した `code_verifier` から SHA256 + Base64URL で算出した値

---

### POST /api/auth/google/callback

Google OAuth 2.0 の認可コードを受け取り、`code_verifier` と共にトークン交換を実施し、セッションを発行します。

#### リクエスト

```json
{
  "code": "authorization_code_from_google",
  "code_verifier": "pkce_code_verifier_from_frontend",
  "redirect_uri": "https://example.com/callback",
  "state": "opaque_state_value"
}
```

#### レスポンス（200 OK）

**レスポンスボディ:**
```json
{
  "data": {
    "id": "usr_01HXYZ1234567890ABCDEF",
    "email": "user@example.com",
    "name": "山田 太郎",
    "picture": "https://lh3.googleusercontent.com/...",
    "timezone": "Asia/Tokyo"
  }
}
```

**レスポンスヘッダー（セッション Cookie）:**
```
Set-Cookie: session=<opaque-token>; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=604800
```

**注**:
- レスポンスボディは `APIResponse[UserResponse]`。フロントエンドはそのまま `setCurrentUser` に渡せる
- セッショントークンはサーバ側 DB（sessions テーブル）で管理し、フロントには公開しない
- `Secure` 属性は環境依存（ローカル/E2E は false、本番は true）
- Google の access/refresh/id_token はバックエンドで一時利用のみとし、フロントには露出させない
- ログイン成功時の副作用として、当該ユーザーの current week レコードを既定値で存在保証する（既存の場合は変更なし）

#### エラーレスポンス（400 Bad Request）

```json
{
  "error": {
    "code": "INVALID_AUTHORIZATION_CODE",
    "message": "認可コードの検証に失敗しました"
  }
}
```

---

### POST /api/auth/logout

ログアウト処理を行い、セッションを revoke して Cookie を削除します。Cookie が無くても 200 を返します（冪等）。

#### リクエスト

リクエストボディ・ヘッダーは不要です。Cookie `session` はブラウザが自動送信します。

#### レスポンス（200 OK）

**レスポンスボディ:**
```json
{
  "data": {
    "message": "ログアウトしました"
  }
}
```

**レスポンスヘッダー（Cookie削除）:**
```
Set-Cookie: session=; HttpOnly; Secure; SameSite=lax; Path=/api; Max-Age=0
```

---

### POST /api/auth/stub-login

**E2E テスト / ローカル開発用のスタブログインエンドポイント**。

本エンドポイントは `AUTH_STUB_ENABLED=true` **かつ** 非本番環境（`APP_ENV != production`）の場合のみ有効。
有効判定には専用の判定関数を用意し、本番環境では環境変数の値に関わらず常に無効とする。

#### リクエスト

```json
{
  "email": "test-user@example.com",
  "name": "テストユーザー"
}
```

#### レスポンス（200 OK）

**レスポンスボディ:**
```json
{
  "data": {
    "id": "usr_01HXYZ1234567890ABCDEF",
    "email": "test-user@example.com",
    "name": "テストユーザー",
    "picture": null,
    "timezone": "Asia/Tokyo"
  }
}
```

**レスポンスヘッダー（セッション Cookie）:**
```
Set-Cookie: session=<opaque-token>; HttpOnly; SameSite=Lax; Path=/api; Max-Age=604800
```

**注**:
- レスポンスボディは `APIResponse[UserResponse]`（Google コールバックと同形式）
- セッションは通常のサーバ側セッションと同じ仕組み（sessions テーブル管理）
- ログイン成功時の副作用として、当該ユーザーの current week レコードを既定値で存在保証する（既存の場合は変更なし）

#### エラーレスポンス（404 Not Found）

本番環境や `AUTH_STUB_ENABLED=false` の場合は、エンドポイント自体が存在しないように 404 を返す。

---

## ユーザー API

### GET /api/users/me

現在ログイン中のユーザー情報を取得します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "usr_01HXYZ1234567890ABCDEF",
    "email": "user@example.com",
    "name": "山田 太郎",
    "picture": "https://lh3.googleusercontent.com/...",
    "timezone": "Asia/Tokyo",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

---

## タスク API

### GET /api/tasks

ユーザーのアクティブなタスク一覧を取得します。ページング対応。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| include_archived | boolean | No | アーカイブ済みタスクを含める（デフォルト: false） |
| page | integer | No | ページ番号（1-indexed、最小1・最大10000、デフォルト: 1） |
| per_page | integer | No | 1ページあたり件数（最小1・最大100、デフォルト: 20） |

#### レスポンス（200 OK）

```json
{
  "data": {
    "items": [
      {
        "id": "tsk_01HXYZ1234567890ABCDEF",
        "name": "英語学習",
        "is_archived": false,
        "consumed_units_last_week": 5.0,
        "consumed_units_total": 12.5,
        "created_at": "2024-01-10T09:00:00Z",
        "updated_at": "2024-01-10T09:00:00Z"
      },
      {
        "id": "tsk_02HXYZ1234567890ABCDEF",
        "name": "個人開発",
        "is_archived": false,
        "consumed_units_last_week": 0.0,
        "consumed_units_total": 3.0,
        "created_at": "2024-01-10T09:05:00Z",
        "updated_at": "2024-01-10T09:05:00Z"
      }
    ],
    "total": 2,
    "page": 1,
    "per_page": 20
  }
}
```

---

### POST /api/tasks

新規タスクを作成します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "name": "筋トレ"
}
```

#### レスポンス（201 Created）

```json
{
  "data": {
    "id": "tsk_04HXYZ1234567890ABCDEF",
    "name": "筋トレ",
    "is_archived": false,
    "consumed_units_last_week": 0.0,
    "consumed_units_total": 0.0,
    "created_at": "2024-01-15T14:00:00Z",
    "updated_at": "2024-01-15T14:00:00Z"
  }
}
```

#### エラーレスポンス（400 Bad Request）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "タスク名は1文字以上100文字以内で入力してください"
  }
}
```

---

### PUT /api/tasks/{task_id}

既存タスクを更新します。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| task_id | string | タスクID |

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "name": "TOEIC学習"
}
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "tsk_01HXYZ1234567890ABCDEF",
    "name": "TOEIC学習",
    "is_archived": false,
    "consumed_units_last_week": 5.0,
    "consumed_units_total": 12.5,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
```

#### エラーレスポンス（404 Not Found）

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "指定されたタスクが見つかりません"
  }
}
```

---

### DELETE /api/tasks

複数タスクをまとめてアーカイブ（論理削除）します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "ids": [
    "tsk_01HXYZ1234567890ABCDEF",
    "tsk_02HXYZ1234567890ABCDEF"
  ]
}
```

**注**:
- `ids` は 1 件以上 100 件以下
- 重複IDは内部でデデュープされる

#### レスポンス（200 OK）

```json
{
  "data": {
    "archived_ids": ["tsk_01HXYZ1234567890ABCDEF"],
    "not_found_ids": ["tsk_02HXYZ1234567890ABCDEF"]
  }
}
```

| フィールド | 説明 |
|------------|------|
| archived_ids | アーカイブできたタスクIDの一覧 |
| not_found_ids | 存在しない・他ユーザー所有・既にアーカイブ済みのタスクIDの一覧 |

---

### DELETE /api/tasks/{task_id}

タスクを削除（アーカイブ）します。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| task_id | string | タスクID |

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "tsk_01HXYZ1234567890ABCDEF",
    "name": "TOEIC学習",
    "is_archived": true,
    "consumed_units_last_week": 5.0,
    "consumed_units_total": 12.5,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-15T16:00:00Z"
  }
}
```

---

## 週 API

### GET /api/weeks/current

現在の週情報を取得します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| timezone | string | No | タイムゾーン（デフォルト: ユーザー設定値） |

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "wk_01HXYZ1234567890ABCDEF",
    "user_id": "usr_01HXYZ1234567890ABCDEF",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "unit_duration_minutes": 30,
    "week_start_day": "monday",
    "week_start_hour": 4,
    "created_at": "2024-01-15T04:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**注**: `unit_duration_minutes`の選択肢は 10, 30, 60, 120 のいずれか。

---

### PUT /api/weeks/current

現在の週設定を更新します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "unit_duration_minutes": 60
}
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "wk_01HXYZ1234567890ABCDEF",
    "user_id": "usr_01HXYZ1234567890ABCDEF",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "unit_duration_minutes": 60,
    "week_start_day": "monday",
    "week_start_hour": 4,
    "created_at": "2024-01-15T04:00:00Z",
    "updated_at": "2024-01-16T11:00:00Z"
  }
}
```

#### エラーレスポンス（400 Bad Request）

```json
{
  "error": {
    "code": "INVALID_UNIT_DURATION",
    "message": "ユニット時間は10, 30, 60, 120分のいずれかを指定してください"
  }
}
```

---

## 目標 API

### GET /api/weeks/current/goals

今週の目標一覧を取得します。

**注**: current week が存在しない場合（初回アクセス時）は、既定値（`unit_duration_minutes=30`、`daily_available_units=0.0`）で自動作成され、`goals: []` の空配列を返します。`WEEK_NOT_FOUND` エラーは返りません。その場合 `has_current_goals=false` となり、過去に Goal を持つ Week があれば `previous_goals` にその内容を返します（なければ `null`）。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "week_start_date": "2026-01-12",
    "unit_duration_minutes": 30,
    "daily_available_units": {
      "monday": 2.0,
      "tuesday": 2.0,
      "wednesday": 2.0,
      "thursday": 2.0,
      "friday": 2.0,
      "saturday": 4.0,
      "sunday": 4.0
    },
    "has_current_goals": true,
    "previous_goals": null,
    "goals": [
      {
        "task_id": "tsk_01HXYZ1234567890ABCDEF",
        "task_name": "英語学習",
        "daily_targets": {
          "monday": 2.0,
          "tuesday": 1.0,
          "wednesday": 2.0,
          "thursday": 1.0,
          "friday": 2.0,
          "saturday": 0,
          "sunday": 0
        }
      },
      {
        "task_id": "tsk_02HXYZ1234567890ABCDEF",
        "task_name": "個人開発",
        "daily_targets": {
          "monday": 2.0,
          "tuesday": 2.0,
          "wednesday": 0,
          "thursday": 2.0,
          "friday": 0,
          "saturday": 4.0,
          "sunday": 4.0
        }
      }
    ]
  }
}
```

当週に Goal が存在しない場合（`has_current_goals: false`）、過去週に設定があれば `previous_goals` を返します:

```json
{
  "data": {
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "week_start_date": "2026-01-19",
    "unit_duration_minutes": 30,
    "daily_available_units": { "monday": 2.0, "tuesday": 2.0, "wednesday": 2.0, "thursday": 2.0, "friday": 2.0, "saturday": 4.0, "sunday": 4.0 },
    "has_current_goals": false,
    "goals": [],
    "previous_goals": {
      "week_id": "wk_00HXYZ1234567890ABCDEF",
      "week_start_date": "2026-01-12",
      "unit_duration_minutes": 30,
      "daily_available_units": { "monday": 2.0, "tuesday": 2.0, "wednesday": 2.0, "thursday": 2.0, "friday": 2.0, "saturday": 4.0, "sunday": 4.0 },
      "goals": [
        {
          "task_id": "tsk_01HXYZ1234567890ABCDEF",
          "task_name": "英語学習",
          "daily_targets": { "monday": 2.0, "tuesday": 1.0, "wednesday": 2.0, "thursday": 1.0, "friday": 2.0, "saturday": 0, "sunday": 0 }
        }
      ]
    }
  }
}
```

**フィールド説明**:

| フィールド | 型 | 説明 |
|---|---|---|
| `has_current_goals` | `bool` | 当週に Goal が1件以上存在するか |
| `previous_goals` | `PreviousGoalsResponse \| null` | 当週 Goal が未設定かつ過去に Goal を持つ Week がある場合のみ返す。それ以外は `null` |
| `previous_goals.goals` | `GoalResponse[]` | アーカイブ済みタスク（`is_archived=true`）由来の Goal は除外済み |

---

### PUT /api/weeks/current/goals

今週の目標を一括更新します。週の目標設定ウィザードの保存時に使用します。

**注**: current week が存在しない場合（初回ユーザー）は自動作成してから更新します。`WEEK_NOT_FOUND` エラーは返りません。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "unit_duration_minutes": 30,
  "goals": [
    {
      "task_id": "tsk_01HXYZ1234567890ABCDEF",
      "daily_targets": {
        "monday": 2.0,
        "tuesday": 1.0,
        "wednesday": 2.0,
        "thursday": 1.0,
        "friday": 2.0,
        "saturday": 0,
        "sunday": 0
      }
    },
    {
      "task_id": "tsk_02HXYZ1234567890ABCDEF",
      "daily_targets": {
        "monday": 2.0,
        "tuesday": 2.0,
        "wednesday": 0,
        "thursday": 2.0,
        "friday": 0,
        "saturday": 4.0,
        "sunday": 4.0
      }
    },
    {
      "task_id": null,
      "new_task_name": "筋トレ",
      "daily_targets": {
        "monday": 1.0,
        "tuesday": 0,
        "wednesday": 1.0,
        "thursday": 0,
        "friday": 1.0,
        "saturday": 0,
        "sunday": 0
      }
    }
  ]
}
```

**注**:
- `task_id`がnullの場合、`new_task_name`で新規タスクを作成します。
- リクエストに含まれないタスクは今週の目標から除外されます。

#### レスポンス（200 OK）

```json
{
  "data": {
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "unit_duration_minutes": 30,
    "goals": [
      {
        "task_id": "tsk_01HXYZ1234567890ABCDEF",
        "task_name": "英語学習",
        "daily_targets": {
          "monday": 2.0,
          "tuesday": 1.0,
          "wednesday": 2.0,
          "thursday": 1.0,
          "friday": 2.0,
          "saturday": 0,
          "sunday": 0
        }
      },
      {
        "task_id": "tsk_02HXYZ1234567890ABCDEF",
        "task_name": "個人開発",
        "daily_targets": {
          "monday": 2.0,
          "tuesday": 2.0,
          "wednesday": 0,
          "thursday": 2.0,
          "friday": 0,
          "saturday": 4.0,
          "sunday": 4.0
        }
      },
      {
        "task_id": "tsk_04HXYZ1234567890ABCDEF",
        "task_name": "筋トレ",
        "daily_targets": {
          "monday": 1.0,
          "tuesday": 0,
          "wednesday": 1.0,
          "thursday": 0,
          "friday": 1.0,
          "saturday": 0,
          "sunday": 0
        }
      }
    ],
    "created_tasks": [
      {
        "id": "tsk_04HXYZ1234567890ABCDEF",
        "name": "筋トレ"
      }
    ]
  }
}
```

---

## 実績 API

### GET /api/weeks/current/records

今週の実績一覧を取得します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "unit_duration_minutes": 30,
    "records": [
      {
        "task_id": "tsk_01HXYZ1234567890ABCDEF",
        "task_name": "英語学習",
        "daily_actuals": {
          "monday": 2.5,
          "tuesday": 1.0,
          "wednesday": 0,
          "thursday": 0,
          "friday": 0,
          "saturday": 0,
          "sunday": 0
        }
      },
      {
        "task_id": "tsk_02HXYZ1234567890ABCDEF",
        "task_name": "個人開発",
        "daily_actuals": {
          "monday": 2.0,
          "tuesday": 1.5,
          "wednesday": 0,
          "thursday": 0,
          "friday": 0,
          "saturday": 0,
          "sunday": 0
        }
      }
    ]
  }
}
```

---

### POST /api/weeks/current/records

実績を記録します。

既存クライアントとの互換のために残しているエンドポイントです。新規実装では、より明示的な `PUT /api/weeks/current/records/{day_of_week}/{task_id}` の利用を推奨します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### リクエスト

```json
{
  "task_id": "tsk_01HXYZ1234567890ABCDEF",
  "day_of_week": "wednesday",
  "actual_units": 1.5
}
```

**注**: `day_of_week`は `monday` 〜 `sunday` のいずれか。`actual_units`は0.1単位で指定可能。

#### レスポンス（201 Created）

```json
{
  "data": {
    "id": "rec_01HXYZ1234567890ABCDEF",
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "task_id": "tsk_01HXYZ1234567890ABCDEF",
    "task_name": "英語学習",
    "day_of_week": "wednesday",
    "actual_units": 1.5,
    "created_at": "2024-01-17T18:00:00Z",
    "updated_at": "2024-01-17T18:00:00Z"
  }
}
```

#### エラーレスポンス（400 Bad Request）

```json
{
  "error": {
    "code": "INVALID_DAY",
    "message": "無効な曜日が指定されました"
  }
}
```

---

### PUT /api/weeks/current/records/{day_of_week}/{task_id}

特定曜日・特定タスクの実績を保存または更新します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
Content-Type: application/json
```

#### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|----|------|------|
| day_of_week | string | Yes | `monday` 〜 `sunday` |
| task_id | string | Yes | 更新対象のタスクID |

#### リクエスト

```json
{
  "actual_units": 1.5
}
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "rec_01HXYZ1234567890ABCDEF",
    "week_id": "wk_01HXYZ1234567890ABCDEF",
    "task_id": "tsk_01HXYZ1234567890ABCDEF",
    "task_name": "英語学習",
    "day_of_week": "wednesday",
    "actual_units": 1.5,
    "created_at": "2024-01-17T18:00:00Z",
    "updated_at": "2024-01-17T18:30:00Z"
  }
}
```

```json
{
  "error": {
    "code": "INVALID_ACTUAL_UNITS",
    "message": "実績ユニット数は0以上の0.1単位で指定してください"
  }
}
```

---

## ダッシュボード API

### GET /api/dashboard

ダッシュボード表示用の集約データを取得します。

#### リクエストヘッダー

```
Cookie: session=<opaque-token>
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| timezone | string | No | タイムゾーン（デフォルト: ユーザー設定値） |

#### レスポンス（200 OK）

```json
{
  "data": {
    "current_date": "2024-01-17",
    "current_day_of_week": "wednesday",
    "week": {
      "id": "wk_01HXYZ1234567890ABCDEF",
      "start_date": "2024-01-15",
      "end_date": "2024-01-21",
      "unit_duration_minutes": 30
    },
    "today_goals": [
      {
        "task_id": "tsk_01HXYZ1234567890ABCDEF",
        "task_name": "英語学習",
        "target_units": 2.0,
        "actual_units": 1.5,
        "completion_rate": 75.0
      },
      {
        "task_id": "tsk_02HXYZ1234567890ABCDEF",
        "task_name": "個人開発",
        "target_units": 0,
        "actual_units": 0,
        "completion_rate": null
      }
    ],
    "weekly_matrix": [
      {
        "task_id": "tsk_01HXYZ1234567890ABCDEF",
        "task_name": "英語学習",
        "daily_data": {
          "monday": {
            "target_units": 2.0,
            "actual_units": 2.5,
            "completion_rate": 125.0
          },
          "tuesday": {
            "target_units": 1.0,
            "actual_units": 1.0,
            "completion_rate": 100.0
          },
          "wednesday": {
            "target_units": 2.0,
            "actual_units": 1.5,
            "completion_rate": 75.0
          },
          "thursday": {
            "target_units": 1.0,
            "actual_units": 0,
            "completion_rate": 0
          },
          "friday": {
            "target_units": 2.0,
            "actual_units": 0,
            "completion_rate": 0
          },
          "saturday": {
            "target_units": 0,
            "actual_units": 0,
            "completion_rate": null
          },
          "sunday": {
            "target_units": 0,
            "actual_units": 0,
            "completion_rate": null
          }
        }
      },
      {
        "task_id": "tsk_02HXYZ1234567890ABCDEF",
        "task_name": "個人開発",
        "daily_data": {
          "monday": {
            "target_units": 2.0,
            "actual_units": 2.0,
            "completion_rate": 100.0
          },
          "tuesday": {
            "target_units": 2.0,
            "actual_units": 1.5,
            "completion_rate": 75.0
          },
          "wednesday": {
            "target_units": 0,
            "actual_units": 0,
            "completion_rate": null
          },
          "thursday": {
            "target_units": 2.0,
            "actual_units": 0,
            "completion_rate": 0
          },
          "friday": {
            "target_units": 0,
            "actual_units": 0,
            "completion_rate": null
          },
          "saturday": {
            "target_units": 4.0,
            "actual_units": 0,
            "completion_rate": 0
          },
          "sunday": {
            "target_units": 4.0,
            "actual_units": 0,
            "completion_rate": 0
          }
        }
      }
    ],
    "has_goals_configured": true
  }
}
```

**注**:
- `completion_rate`は目標が0の場合は`null`を返します。
- `has_goals_configured`が`false`の場合、目標設定ウィザードへの誘導が必要です。

---

## データ型定義

### ユーザー (User)

| フィールド | 型 | 説明 |
|------------|------|------|
| id | string | ユーザーID（ULID形式、prefix: usr_） |
| email | string | メールアドレス |
| name | string | 表示名 |
| picture | string | プロフィール画像URL |
| timezone | string | タイムゾーン（IANA形式） |
| created_at | string | 作成日時（ISO 8601） |
| updated_at | string | 更新日時（ISO 8601） |

### タスク (Task)

| フィールド | 型 | 説明 |
|------------|------|------|
| id | string | タスクID（ULID形式、prefix: tsk_） |
| name | string | タスク名（1-100文字） |
| is_archived | boolean | アーカイブフラグ |
| consumed_units_last_week | number | 先週（ユーザーTZのISO週相当）の消化ユニット数合計 |
| consumed_units_total | number | 全期間の消化ユニット数合計 |
| created_at | string | 作成日時（ISO 8601） |
| updated_at | string | 更新日時（ISO 8601） |

### 週 (Week)

| フィールド | 型 | 説明 |
|------------|------|------|
| id | string | 週ID（ULID形式、prefix: wk_） |
| user_id | string | ユーザーID |
| start_date | string | 週開始日（YYYY-MM-DD） |
| end_date | string | 週終了日（YYYY-MM-DD） |
| unit_duration_minutes | integer | 1ユニットの時間（分）: 10, 30, 60, 120 |
| week_start_day | string | 週開始曜日: "monday" or "sunday" |
| week_start_hour | integer | 週開始時刻（時）: 0-23 |
| created_at | string | 作成日時（ISO 8601） |
| updated_at | string | 更新日時（ISO 8601） |

### 目標 (Goal)

| フィールド | 型 | 説明 |
|------------|------|------|
| task_id | string | タスクID |
| task_name | string | タスク名 |
| daily_targets | object | 曜日ごとの目標ユニット数 |

### 実績 (Record)

| フィールド | 型 | 説明 |
|------------|------|------|
| id | string | 実績ID（ULID形式、prefix: rec_） |
| week_id | string | 週ID |
| task_id | string | タスクID |
| task_name | string | タスク名 |
| day_of_week | string | 曜日 |
| actual_units | number | 実績ユニット数（0.1単位） |
| created_at | string | 作成日時（ISO 8601） |
| updated_at | string | 更新日時（ISO 8601） |

### 曜日 (DayOfWeek)

```
monday | tuesday | wednesday | thursday | friday | saturday | sunday
```

---

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| UNAUTHORIZED | 401 | 認証が必要です |
| INVALID_TOKEN | 401 | セッショントークンが無効または期限切れです |
| CSRF_VALIDATION_FAILED | 403 | CSRF 検証に失敗しました（Origin/Referer が許可オリジンと一致しない） |
| INVALID_AUTHORIZATION_CODE | 400 | Google OAuth の認可コード検証に失敗しました |
| INVALID_STATE | 400 | OAuth の state 検証に失敗しました（CSRF対策） |
| FORBIDDEN | 403 | このリソースへのアクセス権限がありません |
| TASK_NOT_FOUND | 404 | タスクが見つかりません |
| WEEK_NOT_FOUND | 404 | 週データが見つかりません（注: goals API `GET/PUT /api/weeks/current/goals` では current week が自動作成されるため、このエラーは返らない） |
| VALIDATION_ERROR | 400 | 入力値が不正です |
| INVALID_UNIT_DURATION | 400 | ユニット時間の値が不正です |
| INVALID_DAY | 400 | 曜日の値が不正です |
| INVALID_ACTUAL_UNITS | 400 | 実績ユニット数の値が不正です |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 1.0.0 | 2024-01-15 | 初版作成 |
| 1.1.0 | 2026-04-23 | 認証を Auth0 から Google OAuth 2.0 直接連携（BFF型 + PKCE）に変更。`/api/auth/google/authorize`, `/api/auth/google/callback`, `/api/auth/stub-login` を追加。Cookie の SameSite を Strict→Lax に変更、Secure は環境依存に。 |
| 1.2.0 | 2026-05-23 | タスク API を拡張。`GET /api/tasks` にページング対応（`page`/`per_page` クエリパラメータ追加）、レスポンス形式を `items/total/page/per_page` に変更、`consumed_units_last_week`/`consumed_units_total` フィールド追加。`DELETE /api/tasks`（バルクアーカイブ）を追加。Task 型に `consumed_units_last_week`/`consumed_units_total` フィールドを追記。 |
| 1.3.0 | 2026-06-21 | TCH-75: 認証方式を JWT Bearer Token からサーバ側セッション（HttpOnly Cookie `session`、SameSite=Lax、Path=/api）に移行。`POST /api/auth/refresh` を削除。`/api/auth/google/callback` および `/api/auth/stub-login` のレスポンスを `TokenResponse` から `APIResponse[UserResponse]` に変更（Set-Cookie でセッション確立）。`POST /api/auth/logout` をリクエストヘッダー不要・冪等に変更（session Cookie を revoke + Max-Age=0 で削除）。全 API の `Authorization: Bearer` ヘッダを `Cookie: session=<opaque-token>` に変更。CSRF ミドルウェア（Origin/Referer 検証）を追加し `CSRF_VALIDATION_FAILED`（403）エラーコードを追加。`INVALID_REFRESH_TOKEN` エラーコードを削除。 |
