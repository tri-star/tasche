---
name: fastapi-0137-router-tree-regression
description: FastAPI >=0.137 で include_router() ネスト時に route.path から prefix が消える。backend/src/tasche/main.py のトレース用ルート解決に影響し、修正済み
metadata:
  type: project
---

FastAPI 0.137.0 でルーター内部実装が「フラットなリストのコピー」から「ツリー構造 (`_IncludedRouter` でネストした include_router を保持する方式)」に変更された。この結果、`request.scope["route"]` (= マッチした `APIRoute`) の `.path` 属性は各ルーターの生の (prefix 未結合の) パスのみを返すようになった。

例: `app.include_router(api_router, prefix="/api")` → `api_router.include_router(tasks.router, prefix="/tasks")` → `tasks.router` に `@router.get("/{id}")` と定義していた場合、旧 FastAPI (<0.137) では `route.path == "/api/tasks/{id}"` だったが、新 FastAPI (>=0.137) では `route.path == "/{id}"` にしかならない (prefix が失われる)。

**影響を受けた箇所**: `packages/backend/src/tasche/main.py` の `_route_path()` / `_set_http_span_attributes_from_scope()`。OpenTelemetry のスパン名・`http.route`・`aws.local.operation` 属性の生成に `route.path` を直接使っていたため、CloudWatch/X-Ray 上のトレースが ID ごとに異なるスパン名になり可観測性が劣化する変更だった（アプリの機能自体は壊れず、pytest も検知しない。テストはモックの `route` オブジェクトで検証しており実際のルーティングを経由しないため）。

**修正方法**: `fastapi.routing.iter_route_contexts()` (FastAPI 0.137.2 で追加された公開API) を使い、`app.routes` を辿って `context.original_route is route` で一致するものを探し `context.path` (prefix 結合済みの実効パス) を取得する。`_resolve_full_route_path(app, route)` ヘルパーとして実装済み (PR #64, commit 4373a26)。`app` が None (ユニットテストなど) の場合は従来通り `getattr(route, "path", None)` にフォールバックする。

**関連の未解決問題**: `opentelemetry-instrumentation-fastapi` にも全く同じ根本原因のバグがある ([open-telemetry/opentelemetry-python-contrib#4699](https://github.com/open-telemetry/opentelemetry-python-contrib/issues/4699))。修正は `opentelemetry-instrumentation-fastapi` 0.64b0 (opentelemetry-python-contrib 1.43.0) で取り込まれたが、`aws-opentelemetry-distro` は 0.18.0 (2026-07-03時点の最新) でもまだ `opentelemetry-instrumentation-fastapi==0.63b1` に固定しており未修正。aws-opentelemetry-distro が 0.63b1 を超えるバージョンに追従したら、この制約が解消されているか確認すること（それまでは otel 側ライブラリ自身が生成する一部のスパン属性は degraded のままの可能性があるが、`main.py` 側の独自ミドルウェアが後から上書きするため実害は限定的なことを確認済み）。

Why: fastapi・aws-opentelemetry-distro のマイナー更新は semver 的には安全に見えるが、実際にはルーティング内部構造の破壊的変更が非メジャーバージョンで入っていた。route.path に依存するコード・ライブラリ全般に影響するため、今後同様の fastapi マイナー更新PRでも `include_router` を使うネスト構成のプロジェクトでは要注意。

How to apply: 今後 fastapi の更新PR (特に 0.137 以降を跨ぐもの) を扱う際は、`grep -rn "route.path\|scope\[.route.\]\|\.routes\b" src/` 相当で影響箇所を洗い出し、実際に `TestClient` + ネストされた `include_router` 構成でレスポンスの route 解決を検証すること (単体テストのモックだけでは検知できない)。
