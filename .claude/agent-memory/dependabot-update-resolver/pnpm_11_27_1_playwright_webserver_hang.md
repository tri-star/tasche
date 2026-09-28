---
name: pnpm-11-27-1-playwright-webserver-hang
description: CIのpnpm 11.27.1(および12.6.0)でPlaywright webServerが終了時にハングする。playwright.configにgracefulShutdown SIGTERMで回避(PR #122)
metadata:
  type: project
---

frontend-e2e が「全テスト完了後にサマリもfinallyも出ずtimeout cancelled」になる場合、依存更新ではなくCIのpnpmバージョン起因を疑う。

**Why:** pnpm/action-setup の `version: "11"` は最新11.xに解決される。pnpm 11.27.1 は非TTY実行時にスクリプトを独立プロセスグループで起動し、PlaywrightのwebServer停止(プロセスグループへSIGKILL)がvite本体に届かずpipeが閉じない(https://github.com/joshuafolkken/kit/issues/2386 、pnpm 12.6.0でも同種 https://github.com/pnpm/pnpm/issues/15555 )。PR #118(1.62.1)が通ってPR #122(1.63.0)で落ちたのは、その間にpnpmが上がっただけで@playwright/testやviteは無関係だった。

**How to apply:** playwright.config.tsのwebServerに `gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 }` を設定済み。ローカルpnpmは10系のため再現不可、CIで検証する。同症状が再発したらCIログの `Switching pnpm from ... to ...` でpnpmバージョンを確認。
