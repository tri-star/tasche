---
name: project_tch61_review
description: TCH-61 pytest DB設定統合とコロケーション化のセキュリティレビュー結果サマリ（2026-05-31実施）
metadata:
  type: project
---

TCH-61-pytest-db-colocationブランチのセキュリティレビューを実施（2026-05-31）。

**主要な指摘事項:**

1. (Medium) `_apply_migrations`でのグローバル`settings.database_url`書き換えはsyncセッションスコープで実行されるため、pytestが単一プロセス・シングルスレッドで動く限り安全。ただしpytest-xdist等で並列化すると危険になる設計的注意点がある。

2. (Medium) `_truncate_all_tables`のTRUNCATEはpg_tablesから取得したテーブル名を直接f-stringで結合しており、識別子のクォートがない。テーブル名はシステムカタログ由来のため実用リスクは低いが、quoted identifier使用が推奨される。

3. (Low) `production_settings`フィクスチャで`auth_stub_enabled=True`をパッチしているが、`is_auth_stub_enabled("production", True) == False`により実際には無効化される。誤解を招く設計だが機能的に安全。

4. (Low) compose.yamlの`api`サービスで`TEST_JWT_SECRET=${JWT_SECRET}`となっており、`test_jwt_secret == jwt_secret`になる。ただし`security.py`の検証経路に`test_jwt_secret`は入らないため実害なし（既存の問題、本ブランチ外）。

5. (確認済み) DB名ガードの`!= "tasche_test"`完全一致チェックは正しく機能する。

6. (確認済み) `is_auth_stub_enabled("production", True) == False`のロジックはtest_env.pyで網羅的にテスト済み。

**Why:** TCH-61はテスト基盤の整備であり本番コードの変更は含まない。セキュリティリスクはすべて低〜中程度。

**How to apply:** 今後のテスト基盤変更レビュー時は、settings書き換えの並列安全性とSQL識別子クォートを確認する。
