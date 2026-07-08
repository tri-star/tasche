---
name: backend-cryptography-dev-extra-is-actually-runtime-dep
description: backend pyproject.tomlのdev extra限定のcryptography記載は見た目上devのみだが、authlib/joserfc経由で本番ランタイムでも同一バージョンが使われる
metadata:
  type: project
---

`packages/backend/pyproject.toml` では `cryptography` は `dev` extra / `dev-dependencies` グループにのみバージョン指定されている（テスト用RSA鍵生成 `conftest.py` で直接使用）。しかし `uv.lock` を見ると `authlib` と `joserfc`（本番の `core/oauth.py` で Google ID Token のRS256検証に使用、いずれもバージョン制約なしで `cryptography` に依存）が同じ `cryptography` を要求しており、uvは単一ロックファイルでバージョンを統一するため、**dev extra限定に見えるcryptographyの更新も実際には本番ランタイムのバージョンに影響する**。

**Why:** PR #78 (cryptography 48.0.0→49.0.0、メジャーアップ)でこの構造に気づいた。表面的には「devの依存だから影響小さい」と判断しがちだが、実際はGoogle OAuth認証フロー（RS256 JWT検証）にも直結する。幸い49.0.0の破壊的変更（非推奨型エイリアス削除・ChaCha20 nonce仕様変更・X.509 NULLパラメータ拒否・OS対応終了）はいずれも `authlib`/`joserfc` の実装（`ChaCha20Poly1305`というAEAD構成を使用、生の`ChaCha20`ストリーム暗号は不使用。X.509証明書も未使用）や本プロジェクトのコードに影響しないと確認できた。

**How to apply:** `cryptography` や他の暗号/JWT関連パッケージ（`authlib`, `joserfc`, `pyjwt`等）がdev extraのみに明記されていても、`uv.lock` で他のプロダクション依存（特に認証まわり）から間接的に参照されていないか必ず確認する。間接参照がある場合は、[[fastapi_0137_router_tree_regression]] のように本番コードパスへの影響も調査対象に含めること。参考: PR #78, `authlib`/`joserfc` はいずれも `cryptography` に上限バージョン制約なし（`pip show` で確認）。
