---
name: playwright-version-docker-image-pin
description: "@playwright/test の更新時は .github/workflows/frontend-ci.yml のPlaywright Dockerイメージタグも同じバージョンに揃える必要がある(PR #99, #100で再発)"
metadata:
  type: project
---

`.github/workflows/frontend-ci.yml` の `frontend-e2e` ジョブは、ブラウザバイナリを
`mcr.microsoft.com/playwright:v<version>-noble` というDockerイメージからコピーする方式を採る
(`docker run ... cp -rp /ms-playwright/. /dest/`)。このイメージタグは `packages/frontend/package.json`
の `@playwright/test` のバージョンと完全に一致させる必要がある。

`@playwright/test` だけをバージョンアップしてこのタグを追従させないと、CIの`frontend-e2e`ジョブが

```
Error: browserType.launch: Executable doesn't exist at /home/.../chromium_headless_shell-<build>/chrome-headless-shell-linux64/chrome-headless-shell
```

で全件失敗する。過去に複数回同種の修正が入っている。
- コミット `59f782376344687df150eaae68d69cf0110f09b8`（1.57.0→1.61.1、PR #70相当）
- コミット `3b7c337ba99baca55bd6c727bca0c23dce718fa8`（1.61.1→1.62.0、PR #99）
- コミット `33c98d9`（1.61.1→1.62.1、PR #100。PR #99のブランチが分岐後にmainへ
  取り込まれる前だったため、PR #100では再度v1.61.1-nobleのままズレていた）

**Why:** Playwrightは「テストランナーのバージョン」と「ダウンロードするブラウザバイナリのビルド番号」が
密結合しており、ズレがあると起動時にバイナリが見つからずクラッシュする。Dockerイメージからのコピー方式は
CIの高速化のためだがバージョン追従を手動でやる必要がある。

**How to apply:**
- `@playwright/test` の更新PRを扱う際は、`packages/frontend/package.json` の新バージョンと
  `.github/workflows/frontend-ci.yml` 内の `mcr.microsoft.com/playwright:v<version>-noble` の
  バージョン番号を必ず一致させる(単純な文字列置換)。
- 同時期に複数のdependabot PRが並行して出ている場合、片方がこのタグを既に追従済みでも、
  もう片方のブランチは分岐時点が古いために追従できていないことがある。「過去にこの修正コミットが
  存在するか」だけでなく「それが現在のブランチのHEADの祖先になっているか」(`git merge-base
  --is-ancestor <commit> HEAD`)を必ず確認すること。
- タグの存在確認はこのサンドボックス環境からは `mcr.microsoft.com` にネットワークアクセスできないため
  直接pullでは検証できない。Playwright側でDockerイメージの公開が一時的に遅延/欠落するインシデントが
  稀に発生する(例: v1.62.0公開時、`microsoft/playwright#41987`で2026-07-25に報告され
  2026-07-27に解消)。WebSearch/WebFetchでタグの存在や既知の問題がないか確認しておくと安全。
- ローカルでのE2E再現方法は[[e2e_local_repro_under_sandbox]]を参照。
