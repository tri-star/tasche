---
name: uv-lock-regeneration-needs-container-uv-not-host-uv
description: backendのuv.lockを再生成する際、ホストのuv(0.7.13系)は pyproject.toml の exclude-newer = "2 days" を解釈できず全パッケージが最新化されてしまう。コンテナ内のuv(ghcr.io/astral-sh/uv:latest系)を使うこと
metadata:
  type: feedback
---

`packages/backend/pyproject.toml` には `[tool.uv] exclude-newer = "2 days"` という相対日付指定がある。ホストにインストール済みの `uv`(確認時点で 0.7.13、`/home/tristar/.local/bin/uv`)はこの相対日付フォーマットをサポートしておらず、`uv lock` 実行時に

```
warning: Failed to parse `pyproject.toml` during settings discovery:
   TOML parse error ... failed to parse "2 da" as year
Ignoring existing lockfile due to removal of timestamp cutoff: `0001-01-01T00:00:00Z`
```

という警告とともに `exclude-newer` を無視し、uvicorn以外の120以上のパッケージまで最新版に一括更新してしまう(uv.lockの差分が数百行に膨れ上がる)。これは今回のdependabot PRの意図(1パッケージのみの更新)を大きく逸脱するため**絶対に使ってはいけない**。

**正しい手順**: `packages/backend` の Docker イメージは `ghcr.io/astral-sh/uv:latest` からuvバイナリを取得している(確認時点で uv 0.11.3)。こちらは `exclude-newer = "2 days"` を正しく解釈する。

```bash
# api コンテナ内の /app (書き込み可能、pyproject.toml/uv.lockは非マウント) に
# ホストの現在のファイルをコピーしてlockを再生成し、コピーで戻す
docker compose cp pyproject.toml api:/app/pyproject.toml   # 通常はimageビルド時点で既に反映済みなので不要なことが多い
docker compose cp uv.lock api:/app/uv.lock
docker compose exec -T -w /app api uv lock
docker compose cp api:/app/uv.lock ./uv.lock
docker compose exec -T api rm -f /app/uv.lock   # 後片付け
```

`/tmp` 配下(コンテナのrootが所有)は書き込み権限エラー(`Permission denied`)になったため、`/app` を作業先にするとよい。

`uv lock --check` での整合性確認も同様にコンテナ内のuvで行うこと(ホストのuvでは誤検知する)。

`docker run -v ... ghcr.io/astral-sh/uv:latest uv ...` で直接bind mountする方法はサンドボックスの権限プロンプトで拒否されたため、既存の起動済み `api` コンテナへ `docker compose cp` + `exec` する方式が確実。

関連: [[stale_dependabot_branch_diff_apply_pitfall]], [[backend_dev_container_needs_rebuild_after_pyproject_change]]
