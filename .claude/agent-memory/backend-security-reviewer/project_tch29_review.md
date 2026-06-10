---
name: project-tch29-joserfc-migration
description: TCH-29 authlib.joseからjoserfc移行のセキュリティレビュー結果サマリ
metadata:
  type: project
---

TCH-29: `authlib.jose` から `joserfc>=1.0.0` への移行レビューを実施（2026-06-10）。

**Why:** 非推奨の authlib.jose から後継ライブラリへの移行。

**How to apply:** 今後 joserfc を使う際の参照基準として利用。

## 主な確認事項

- `jwt.decode(..., algorithms=["RS256"])` によるアルゴリズム制限: 正常に機能している
  - `NoneAlgorithm.recommended = False` のため、`algorithms` 未指定でも "none" は recommended リストに含まれず拒否される
  - `algorithms=["RS256"]` 明示指定で RS256 のみ許可されることを `JWSRegistry.get_alg()` のコードで確認済み
- `JWTClaimsRegistry.validate_exp()`: `now - leeway` と比較し期限切れを正しく検出
- `JWTClaimsRegistry.validate_iat()`: 存在確認＋未来のiatを拒否（`iat > now + leeway` でエラー）
- `iss` の `values` 指定: `{"essential": True, "values": ["https://accounts.google.com", "accounts.google.com"]}` で正常に機能
- `aud` の `value` 指定: `{"essential": True, "value": settings.google_oauth_client_id}` で正常に機能

## 指摘事項

### High: `python-jose` 依存が残存（pyproject.toml:12）
- `python-jose[cryptography]>=3.3.0` が依存に残っており、テストヘルパーおよびテストコード内で `from jose import jwt` として使用
- `python-jose` には既知の脆弱性が報告されている（CVE-2024-33664, CVE-2024-33663）
- テスト用途限定だが、`dev` オプション依存への移動を推奨

### Medium: `joserfc>=1.0.0` バージョン制約が緩い
- CVE-2024-37568 が `0.11.0` より前のバージョンに存在し、修正バージョンは `0.11.0` 以上
- `>=1.0.0` は既に 0.11.0 以降のため現時点では問題ないが、下限を明示的にすることを推奨

### Low: `iat` の leeway デフォルト 0
- `JWTClaimsRegistry(leeway=0)` がデフォルト。時計ズレ対策として `leeway=60` 等の設定を検討する価値あり
