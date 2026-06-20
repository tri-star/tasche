---
name: project-tch75-review
description: TCH-75セッション方式移行のセキュリティレビュー結果（High 2件: delete_cookie属性省略、stateバックエンド未検証）
metadata:
  type: project
---

TCH-75「認証方式の刷新: サーバ側セッション方式への移行」セキュリティレビュー実施済み（2026-06-20）。

## 主要指摘

**High**:
- `cookies.py:clear_session_cookie` が `delete_cookie` に `secure/samesite/httponly` を渡していないため、本番環境でログアウト後もCookieが残存するリスクがある。`set_cookie(max_age=0)` 形式に変更して属性を揃えることで修正。
- OAuth `state` パラメータのバックエンド検証なし（frontend の責務として設計されているが、設計判断の文書化が必要）。

**Medium**:
- `validate_session` 内でスライディング延長時に `db.commit()` を直接呼ぶため、同一DBセッションの後続処理と中間コミットが競合するリスク。`flush()` に留め、commit は呼び出し元で行う方針に変更推奨。
- `GoogleCallbackRequest` / `StubLoginRequest` の `code`, `code_verifier`, `state`, `name` フィールドに `max_length` なし。DoS対策として追加推奨。

**Low**:
- logout エンドポイントのレート制限なし。
- セキュリティヘッダー未設定（`X-Content-Type-Options` 等）。

## 確認済み（問題なし）の主要項目
- SHA-256ハッシュ保存・生トークン非保存: 確認済み
- Cookie HttpOnly/Secure/SameSite: set_cookie 側は適切
- logout 即時 revoke: DBのrevoked_atで機能
- 認証ガード: 全エンドポイントに CurrentUser Depends
- IDOR対策: サービス層でuser_id絞り込み済み
- CORS: 環境変数管理、allow_originは明示的指定
- CSRF: Origin/Referer検証ミドルウェアあり（pass-through設計の前提も確認済み）
- 生SQL: なし（ORM使用）

**Why:** セッション方式移行は認証アーキテクチャの根幹変更であり、レビュー記録を残す。
**How to apply:** 次回レビュー時にH-1（delete_cookie）の修正が完了しているか確認する。
