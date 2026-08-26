---
name: pr103-post-merge-fastapi-uvicorn-combo-verified
description: PR#103 (fastapi 0.141.1等) にPR#104 (uvicorn 0.52.1) をmerge後、両方を同時に反映した状態で再検証し追加修正不要と確認した記録
metadata:
  type: project
---

PR #103（fastapi 0.140.0→0.141.1, alembic→1.19.1, pydantic-settings→2.15.0, ruff→0.16.2）は
[[pr103_backend_minor_patch_no_fix_needed]] で一度「修正不要」と判断済みだったが、その後 main に
PR #104（uvicorn 0.51.0→0.52.1、[[uvicorn_v0521_no_impact]]）がマージされ、PR #103 ブランチが
CONFLICTING になった。オーケストレーターが `git merge origin/main` でコンフリクトを解消し
（`pyproject.toml` は両側を採用、commit `22f9509`）、その後の状態で fastapi 0.141.1 と
uvicorn 0.52.1 の**組み合わせ**を改めて検証した。

**検証内容**:
- `docker compose build api && up -d db api` でイメージを再ビルドし、`uv pip list` で
  fastapi 0.141.1 / uvicorn 0.52.4（`uv pip install -e ".[dev]"` は `>=` 制約解決なのでuv.lockの
  0.52.1より新しい場合がある）/ alembic 1.19.1 / pydantic-settings 2.15.0 / cryptography 50.0.0 が
  反映されていることを確認。
- `docker compose exec api uv run ruff check .` → All checks passed!
- `docker compose exec api uv run ruff format . --check` → 100 files already formatted
- `docker compose exec api uv run --frozen alembic upgrade head`（`DATABASE_URL` をコンテナ内DBホスト
  `db:5432` に上書きする必要あり。`.env` の `DATABASE_URL` はホスト向け`localhost:<port>`のため、
  コンテナ内から直接実行すると接続失敗する）→ 全マイグレーション正常適用。
- `docker compose exec api uv run --frozen pytest -q` → 161 passed
- `curl http://localhost:<API_CONTAINER_PORT>/health` → 200、コンテナログに Traceback なし
- **[[fastapi_0137_router_tree_regression]] の修正コード（`main.py` の `_resolve_full_route_path` /
  `iter_route_contexts`）が fastapi 0.141.1 でも正しく動作することを実機で再確認**した。
  ```python
  from tasche.main import app
  from fastapi.routing import iter_route_contexts
  for ctx in iter_route_contexts(app.routes):
      ...  # /api/users/me, /api/tasks/{task_id} のように prefix 込みの実効パスが正しく得られた
  ```
  （既存の単体テスト `test_main_telemetry.py` はモックの `route` オブジェクトしか使わないため、
  この確認は単体テストでは代替できない。今後 fastapi のマイナー更新PRでは同様に実機確認すること）

**結論**: マージ後の状態でも追加のコード修正は不要。空コミットは作成しなかった。

Why: mainの進行によりdependabot PRがCONFLICTING化し、コンフリクト解消（3-wayマージ）自体は
機械的に問題なくても、「マージ後の組み合わせ」で改めてlint/test/実機確認をしないと、
2つの独立したPRそれぞれでは問題なかった変更が組み合わさった時に問題が起きるリスクを見逃す。

How to apply: 複数のdependabot PRがmainマージ経由でコンフリクトし1つのブランチに合流した場合、
それぞれのPRで個別に「修正不要」と判断済みであっても、マージ後の最終状態で必ずlint/test/alembicの
再実行を行うこと。特にfastapiのバージョンが動くPRでは[[fastapi_0137_router_tree_regression]]の
実効パス解決が壊れていないかを実機で確認する。

関連: [[pr103_backend_minor_patch_no_fix_needed]], [[uvicorn_v0521_no_impact]],
[[stale_dependabot_branch_diff_apply_pitfall]], [[fastapi_0137_router_tree_regression]]
