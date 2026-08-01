---
name: playwright-version-docker-image-pin
description: "@playwright/test の更新時は .github/workflows/frontend-ci.yml のPlaywright Dockerイメージタグも同じバージョンに揃える必要がある(PR #99で再発)"
metadata:
  type: project
---

`.github/workflows/frontend-ci.yml` の `frontend-e2e` ジョブは、ブラウザバイナリを
`mcr.microsoft.com/playwright:v<version>-noble` というDockerイメージからコピーする方式を採る
(`docker run ... cp -rp /ms-playwright/. /dest/`)。このイメージタグは `packages/frontend/package.json`
の `@playwright/test` のバージョンと完全に一致させる必要がある。

`@playwright/test` だけをバージョンアップしてこのタグを追従させないと、`pnpm test:e2e`
(= `playwright test`) が

```
Error: browserType.launch: Executable doesn't exist at /home/.../chromium_headless_shell-<build>/chrome-headless-shell-linux64/chrome-headless-shell
```

で全件失敗する(ローカルで実際に `pnpm exec playwright test` を実行して再現確認済み)。過去にも
PR #70相当のタイミングで同種の修正が入っている(コミット `59f782376344687df150eaae68d69cf0110f09b8`
「fix(ci): PlaywrightブラウザDockerイメージをE2Eテストのバージョンに追従」)。PR #99
(1.61.1→1.62.0)でも同じ修正が必要だった。

**Why:** Playwrightは「テストランナーのバージョン」と「ダウンロードするブラウザバイナリのビルド番号」が
密結合しており、ズレがあると起動時にバイナリが見つからずクラッシュする。Dockerイメージからのコピー方式は
CIの高速化のためだがバージョン追従を手動でやる必要がある。

**How to apply:**
- `@playwright/test` の更新PRを扱う際は、`packages/frontend/package.json` の新バージョンと
  `.github/workflows/frontend-ci.yml` 内の `mcr.microsoft.com/playwright:v<version>-noble` の
  バージョン番号を必ず一致させる(単純な文字列置換)。
- タグの存在確認はこのサンドボックス環境からは `mcr.microsoft.com` にネットワークアクセスできないため
  直接pullでは検証できない。Playwright側でDockerイメージの公開が一時的に遅延/欠落するインシデントが
  稀に発生する(例: v1.62.0公開時、`microsoft/playwright#41987`で2026-07-25に報告され
  2026-07-27に解消)。`gh api repos/microsoft/playwright/issues` で該当バージョンの既知の問題が
  ないかを確認しておくと安全。
- ローカルでのE2E再現方法は[[e2e_local_repro_under_sandbox]]を参照。
