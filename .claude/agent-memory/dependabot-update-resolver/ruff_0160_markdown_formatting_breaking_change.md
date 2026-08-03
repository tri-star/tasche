---
name: ruff-0160-markdown-formatting-breaking-change
description: ruff 0.16.0でMarkdown内Pythonコードブロックもデフォルトでformat対象になり、docs配下のサンプルコードでbackend-lintが落ちる(PR #97で確認)
metadata:
  type: project
---

ruff 0.15.x → 0.16.0 へのアップデート（`backend-minor-patch` グループ等）では、公式ブログ記事にある通り
「Ruff can now format Python code blocks in Markdown files and will do this by default」という破壊的変更がある。

- `packages/backend/docs/*.md` 内の ` ```python ` コードブロック（例: `docs/folder-structure.md` のクラス定義サンプル）が
  ruffのフォーマット規約（クラス定義前に空行2行、など）に沿っていない場合、`ruff format . --check` がそのMarkdownファイルを
  「unformatted」として検出し、CIの `backend-lint` ジョブ（`.github/workflows/backend-ci.yml` の `Ruff format check` ステップ）が失敗する。
  `ruff check .` (lintルール) 自体は通ることが多く、失敗するのは format check の方なので注意。
- 対処は単純で `uv run ruff format .` を実行し、Markdown内のコードブロックも含めて整形し直すだけでよい（今回は空行追加2箇所のみ）。

**罠: ホストで直接 `uv run ruff format .` を実行すると `uv.lock` が意図せず再生成されることがある**

このリポジトリの `packages/backend/pyproject.toml` は `exclude-newer = "2 days"` という相対値を使っているが、
ホスト環境のuvバージョンによっては `TOML parse error ... failed to parse year in date "2 days"` という警告を出し、
その結果 `uv.lock` の `revision` が変わり、多数のパッケージが無関係に再解決されて大量の差分が生じることがある
（CI (`uv-version: "latest"` で毎回最新uvをセットアップ) とは異なる挙動になりうる）。
このアップデートと無関係な `uv.lock` の巻き添え変更をコミットしないよう、
`uv run --frozen ruff format . --check` / `uv run --frozen ruff check .` のように `--frozen` を付けて
lockfileを固定した状態でコマンドを実行するのが安全。万一 `uv.lock` が意図せず変更された場合は
`git checkout -- packages/backend/uv.lock` で元に戻してから、変更が必要なファイルだけをstageする。

Why: PR #97 (`fastapi 0.139.2→0.140.0`, `joserfc 1.7.3→1.7.4`, `aws-opentelemetry-distro 0.18.0→0.19.0`,
`opentelemetry-instrumentation-{fastapi,logging} 0.63b1→0.65b0`, `ruff 0.15.22→0.16.0` の6件更新) で
backend-lintのみFAILUREになっており、原因調査の結果ruff 0.16.0のMarkdownフォーマット機能追加が原因と判明した。
fastapi/joserfc/aws-opentelemetry-distro/opentelemetry-instrumentation-*系は本プロジェクトのコードに影響する
破壊的変更・非推奨化はなし（161 test / ruff check とも通過）。

How to apply: 今後 `ruff` がminor更新されるdependabot PRでbackend-lintがformat checkだけ失敗する場合、
まずruffのリリースノートでMarkdown/other新規デフォルト対象ファイルタイプの追加がないか確認する。
`docs/*.md` にPythonコードブロックを埋め込んでいる箇所（[[pr92_backend_minor_patch_no_fix_needed]] のような
過去の調査対象と合わせて）は今後もこの手のCI破壊が起きうるので、他のドキュメントでも同様の症状が出たら
この記憶を参照して `ruff format .` (--frozen付き) で機械的に直せばよい。
