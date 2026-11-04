---
name: pr132-fastapi-0162-no-fix-needed
description: fastapi 0.143.3→0.162.0 等11件(PR #132)は修正不要。ホストでのbackend全テスト再現手順(TCP直起動postgres)も記録
metadata:
  type: project
---

fastapi 0.145-0.162のBreaking(openapi_prefix削除/root_path非推奨/bool form/null body/**extra削除/param model extra)はいずれも本リポ未使用(Form無し、FastAPI()は title/version/docs_url/redoc_urlのみ、Query/Cookie既定値のみ)。main.pyのiter_route_contexts()も存続。161 test/ruff通過。

**Why:** Dockerもunix socketもsandboxで不可。**How to apply:** pgserver.get_server()はunix socketで失敗するため、`uv pip install pgserver`後 pginstall/bin の initdb/postgres を `-c listen_addresses=127.0.0.1 -c unix_socket_directories=` で直接起動する。bashコール間でプロセスが殺されるので起動・pytest・停止を1コマンドにまとめる。テストには AUTH_STUB_ENABLED=true ENABLE_TEST_AUTH=true APP_ENV=testing と DATABASE_URL/TEST_DATABASE_URL(tasche_test)が必要(無いと48 failed)。generate_openapi.pyはpackages/backend/openapi.jsonを直接上書きするので実行後 git checkout で戻す(コミット済みopenapi.jsonは元々コードと乖離)。
