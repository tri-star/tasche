---
name: stale-dependabot-branch-diff-apply-pitfall
description: git checkout FETCH_HEAD -- pyproject.toml uv.lock でdependabot差分を適用すると、対象PR作成後にmainへマージされた別の依存更新が巻き戻る。正しい解消法はPRブランチにmainをマージすること
metadata:
  type: feedback
---

サンドボックス制約で `gh pr checkout` が使えず、オーケストレーターが
`git checkout FETCH_HEAD -- packages/backend/pyproject.toml packages/backend/uv.lock`
のようにファイル全体をPRブランチの内容で上書きして差分を適用する場合、そのdependabot
ブランチが作られた後にmainへ別の依存更新PRがマージされていると、**ファイル全体が古い
状態に巻き戻る**。ファイル単位の上書きであって3-wayマージではないため。

**実例(PR #104, uvicorn 0.51.0→0.52.1)**: 適用後の `pyproject.toml`/`uv.lock` に
意図しない `cryptography>=50.0.0 → >=49.0.0` のダウングレードが混入した。PR #104の
ブランチがPR #78(`chore(deps): bump cryptography`、コミット `0344e67`)より前のmainから
分岐していたため。

**重要**: これは**検証環境側だけの疑似的な事故**であり、PRそのものの不具合ではない。
GitHub上でPRをmainへマージする際は3-wayマージになるので、PRが触っていない
`cryptography` の行はmain側の値が残り、巻き戻りは起きない。

**How to apply**:
1. ファイル適用後は必ず `git diff HEAD -- <対象ファイル>` で「今回のPRが意図した差分だけ」に
   なっているか確認する。`name = "..."` / `version = "..."` の変化をgrepで機械的に
   チェックすると見つけやすい。
2. 巻き戻りを検出したら、**pyproject.tomlを手で戻して `uv lock` で再生成してはいけない**。
   再生成すると `[options] exclude-newer` がプレースホルダ
   (`0001-01-01T00:00:00Z`)から具体的なタイムスタンプに書き換わるなど、
   今回のPRと無関係な差分が混入する。
3. 正しい解消法は **scratchpadのclone上でPRブランチに `git merge origin/main` する**こと。
   3-wayマージなので巻き戻りは自動的に解消され、mainに対する差分は対象パッケージの
   行だけになる。マージ結果の `pyproject.toml`/`uv.lock` をワークツリーへコピーして
   検証し直せば、検証内容とpush内容が完全に一致する。

   ```bash
   cd "$SP/work" && git merge origin/main -m "Merge branch 'main' into <dependabotブランチ>"
   git diff origin/main HEAD --stat   # 対象パッケージのファイルだけになっているか確認
   cp packages/backend/{pyproject.toml,uv.lock} <worktree>/packages/backend/
   ```

関連: [[backend_dev_container_needs_rebuild_after_pyproject_change]], [[uv_lock_regeneration_needs_container_uv_not_host_uv]], [[git-merge-sandbox-claude]]
