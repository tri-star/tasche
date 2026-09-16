---
name: authlib-18-httpx2-deprecation
description: authlib 1.8.0でhttpx_client統合がhttpx2優先になりhttpxはフォールバック+非推奨警告に。本プロジェクトは現状httpxのみで動作継続、テストへの影響なし(PR #116で確認)
metadata:
  type: project
---

authlib 1.8.0（1.7.2→1.8.0, PR #116で確認）で `authlib.integrations.httpx_client`
の内部実装が `httpx2`（Pydantic社がスチュワードシップを引き継いだ httpx の後継パッケージ、
PyPI: https://pypi.org/project/httpx2/）優先になった。`httpx2` がインストールされて
いない環境では従来の `httpx` にフォールバックするが、その際に
`AuthlibDeprecationWarning: The httpx module is deprecated; please use httpx2 instead.`
が **モジュール import 時に1回** 発生する（`authlib/integrations/httpx_client/assertion_client.py`
の `from ._compat import httpx2` で発火）。

本プロジェクトの `packages/backend/src/tasche/core/oauth.py` は
`from authlib.integrations.httpx_client import AsyncOAuth2Client` を使用しており、
`httpx2` は `pyproject.toml` に未追加（`httpx>=0.28.0` のみ）。フォールバックにより
**機能的な差分は無い**（`AsyncOAuth2Client.fetch_token` の戻り値・例外挙動は変わらず、
161件のテストが全て成功）。

`pyproject.toml` の `[tool.pytest.ini_options]` に `filterwarnings = ["ignore::DeprecationWarning"]`
を設定しているが、この警告は import 時点（conftest 収集より前）に発火するため、
`pytest -q` の warnings summary には引き続き表示される（テストの pass/fail には影響しない）。

Why: 破壊的変更ではなく非推奨警告のみだが、`httpx2` への移行は
`oauth.py` だけでなく `httpx` を直接使う箇所（JWKS取得の `httpx.AsyncClient`）や
テストのモックライブラリ `respx`（`httpx2` 対応状況が未確認）にも影響する可能性があり、
「必要最小限の修正」の範囲を超えるアーキテクチャレベルの変更になるため、
PR #116 の時点ではあえて追随しなかった。

How to apply: 今後 authlib のさらなるメジャー更新で `httpx` フォールバックが
削除された場合は、`httpx2` への全面移行（`oauth.py` の `httpx.AsyncClient` 呼び出し、
`respx` の `httpx2` 対応確認、`pyproject.toml` への `httpx2` 追加）を別タスクとして
計画すること。単純な dependabot グループ更新の中では対応しない。
