# Tasche API 基本設計書

## 概要

本ドキュメントは、Tasche MVP の Backend API 設計を定義します。

### 基本仕様

| 項目 | 仕様 |
|------|------|
| ベースURL | `/api` |
| 認証方式 | JWT Bearer Token（Auth0発行） |
| データ形式 | JSON |
| 文字コード | UTF-8 |

### 認証

認証が必要なAPIには、リクエストヘッダーに以下を含めます：

```
Authorization: Bearer <access_token>
```

### トークン管理方式

SPAでのセキュリティを考慮し、以下の方式を採用します：

| トークン | 保存場所 | 説明 |
|----------|----------|------|
| Access Token | メモリ（JavaScript変数） | APIリクエスト時にAuthorizationヘッダーで送信 |
| Refresh Token | HttpOnly Cookie | JSからアクセス不可、APIリクエスト時に自動送信 |

**Cookie設定（Refresh Token用）:**
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

| 属性 | 値 | 説明 |
|------|------|------|
| HttpOnly | true | JavaScriptからアクセス不可 |
| Secure | true | HTTPS接続時のみ送信 |
| SameSite | Strict | 同一サイトからのリクエストのみ送信 |
| Path | /api/auth | 認証APIのみにCookieを送信 |
| Max-Age | 604800 | 7日間有効 |

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
| 認証 | POST | /api/auth/callback | 不要 | Auth0コールバック処理 |
| 認証 | POST | /api/auth/refresh | 不要 | トークンリフレッシュ |
| 認証 | POST | /api/auth/logout | 要 | ログアウト |
| ユーザー | GET | /api/users/me | 要 | 現在のユーザー情報取得 |
| タスク | GET | /api/tasks | 要 | タスク一覧取得 |
| タスク | POST | /api/tasks | 要 | タスク作成 |
| タスク | PUT | /api/tasks/{task_id} | 要 | タスク更新 |
| タスク | DELETE | /api/tasks/{task_id} | 要 | タスク削除（アーカイブ） |
| 週 | GET | /api/weeks/current | 要 | 現在の週情報取得 |
| 週 | PUT | /api/weeks/current | 要 | 現在の週設定更新 |
| 目標 | GET | /api/weeks/current/goals | 要 | 今週の目標一覧取得 |
| 目標 | PUT | /api/weeks/current/goals | 要 | 今週の目標一括更新 |
| 実績 | GET | /api/weeks/current/records | 要 | 今週の実績一覧取得 |
| 実績 | POST | /api/weeks/current/records | 要 | 実績記録 |
| ダッシュボード | GET | /api/dashboard | 要 | ダッシュボード用データ取得 |

---

## 認証 API

### POST /api/auth/callback

Auth0からのコールバックを処理し、アプリケーション用のトークンを発行します。

#### リクエスト

```json
{
  "code": "authorization_code_from_auth0",
  "redirect_uri": "https://example.com/callback"
}
```

#### レスポンス（200 OK）

**レスポンスボディ:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**レスポンスヘッダー（Refresh Token）:**
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

**注**: Refresh TokenはHttpOnly Cookieとして設定され、レスポンスボディには含まれません。

---

### POST /api/auth/refresh

Cookieに保存されたリフレッシュトークンを使用してアクセストークンを更新します。

#### リクエスト

リクエストボディは不要です。Refresh TokenはCookieから自動的に取得されます。

```
Cookie: refresh_token=<token>
```

#### レスポンス（200 OK）

**レスポンスボディ:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**レスポンスヘッダー（Refresh Token Rotation）:**
```
Set-Cookie: refresh_token=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

**注**: セキュリティ向上のため、Refresh Token Rotation（リフレッシュ時に新しいトークンを発行）を実装します。

#### エラーレスポンス（401 Unauthorized）

```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "リフレッシュトークンが無効または期限切れです"
  }
}
```

---

### POST /api/auth/logout

ログアウト処理を行い、Refresh Token Cookieを削除します。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
Cookie: refresh_token=<token>
```

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
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0
```

---

## ユーザー API

### GET /api/users/me

現在ログイン中のユーザー情報を取得します。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
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

ユーザーのアクティブなタスク一覧を取得します。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|------|------|------|
| include_archived | boolean | No | アーカイブ済みタスクを含める（デフォルト: false） |

#### レスポンス（200 OK）

```json
{
  "data": {
    "tasks": [
      {
        "id": "tsk_01HXYZ1234567890ABCDEF",
        "name": "英語学習",
        "is_archived": false,
        "created_at": "2024-01-10T09:00:00Z",
        "updated_at": "2024-01-10T09:00:00Z"
      },
      {
        "id": "tsk_02HXYZ1234567890ABCDEF",
        "name": "個人開発",
        "is_archived": false,
        "created_at": "2024-01-10T09:05:00Z",
        "updated_at": "2024-01-10T09:05:00Z"
      },
      {
        "id": "tsk_03HXYZ1234567890ABCDEF",
        "name": "読書",
        "is_archived": false,
        "created_at": "2024-01-10T09:10:00Z",
        "updated_at": "2024-01-10T09:10:00Z"
      }
    ]
  }
}
```

---

### POST /api/tasks

新規タスクを作成します。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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

### DELETE /api/tasks/{task_id}

タスクを削除（アーカイブ）します。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|------|------|
| task_id | string | タスクID |

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
```

#### レスポンス（200 OK）

```json
{
  "data": {
    "id": "tsk_01HXYZ1234567890ABCDEF",
    "name": "TOEIC学習",
    "is_archived": true,
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
```

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
      }
    ]
  }
}
```

---

### PUT /api/weeks/current/goals

今週の目標を一括更新します。週の目標設定ウィザードの保存時に使用します。

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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

#### リクエストヘッダー

```
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
| INVALID_TOKEN | 401 | トークンが無効です |
| TOKEN_EXPIRED | 401 | トークンの有効期限が切れています |
| INVALID_REFRESH_TOKEN | 401 | リフレッシュトークンが無効です |
| FORBIDDEN | 403 | このリソースへのアクセス権限がありません |
| TASK_NOT_FOUND | 404 | タスクが見つかりません |
| WEEK_NOT_FOUND | 404 | 週データが見つかりません |
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
