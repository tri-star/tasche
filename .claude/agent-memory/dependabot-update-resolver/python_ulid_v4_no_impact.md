---
name: python-ulid-v4-no-impact
description: python-ulid 3.2.0→4.0.1 のメジャー更新はULID()コンストラクタのみ使用のため修正不要(PR #98)
metadata:
  type: project
---

python-ulid 4.0.0/4.0.1（PR #98, 3.2.0→4.0.1）の破壊的変更（`ValueProvider`/`ULID.provider`削除、内部`validate_type`デコレータ削除、`ULID.from_uuidv7`→`ULID.from_uuid7`リネーム、新`ULIDGenerator`/`default_generator`/monotonicityポリシー導入）は、このリポジトリのulid利用箇所に一切影響しない。

**判断根拠:**
- `grep -rn "ulid" --include="*.py"` の結果、全利用箇所が `from ulid import ULID` と `ULID()` のシンプルなコンストラクタ呼び出し（`f"{prefix}_{ULID()}"` のようなID生成パターン）のみ。
- `grep -rn "provider|from_uuidv7|from_uuid7|validate_type|ULIDGenerator|default_generator|monotonic"` はヒットゼロ。カスタムprovider実装やfrom_uuidv7系メソッドは未使用。
- 利用箇所: `scripts/seed.py`, `scripts/e2e_seed/{goals,records}.py`, `src/tasche/services/{session,goal,record,task,week,user}.py`（各エンティティのID生成関数）, 各種テストファイル。

**確認したコマンド:**
- `docker compose exec -T api uv run ruff check .` → All checks passed
- `docker compose exec -T api uv run ruff format . --check` → 100 files already formatted
- `docker compose exec -T api uv run pytest` → 161 passed

**Why:** メジャーバージョンアップだが実質的にコンストラクタAPIは不変で、削除された機能（カスタムProvider等）は本リポジトリで使われていなかったため。
**How to apply:** 今後 python-ulid の更新PRが来た場合も、まず利用箇所がシンプルな`ULID()`呼び出しのみかを確認すれば、リリースノートの破壊的変更を深く追う必要は薄い。ただしカスタムID生成ロジック（例: monotonicity制御やUUID7からの変換）を新規導入した場合はこの前提が崩れるため要再確認。関連: [[pr92_backend_minor_patch_no_fix_needed]]
