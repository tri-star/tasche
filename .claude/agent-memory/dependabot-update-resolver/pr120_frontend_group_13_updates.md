---
name: pr120-frontend-group-13-updates
description: PR #120 (frontend-minor-patchグループ13件、biome/lucide-react/oauth4webapi/react/react-dom/types-react/types-react-dom/playwright/testing-library-user-event/types-node/orval/postcss/vite) の調査結果
metadata:
  type: project
---

PR #120は `frontend-minor-patch` グループとしてまとめて更新される13件のminor/patch更新（メジャーバージョン変更は含まない）。ほとんどは破壊的変更なしだったが、orvalとPlaywrightの2件でCI失敗を引き起こす実質的な修正が必要だった。

- **orval 8.26.0→8.31.0**: [[orval_upgrade_notes]]に詳細を追記した「feat(core)!: de-inline mocks by default in single and tags modes」（8.28.1で導入、`!`付き破壊的変更）が本命。`mode: "single"`でもモック（msw）が既定で別ファイル`client.msw.ts`に分離されるようになり、`src/mocks/handlers/generated.ts`の`client.ts`エクスポート走査（`MockHandler`で終わる関数名を収集）が空振りしてMSWモックが全滅する。`orval.config.ts`の`output.mock`に`inline: true`を追加して従来のインライン生成に戻した。加えて`getHeaders()`ヘルパーがオブジェクト形式の`options?.headers`（`Record<string, string | readonly string[]>`）も正しく展開できるよう改善されており、body付きリクエスト関数のみ実質差分が出た（呼び出し元は`options.headers`を渡していないため実害なし）。
- **@playwright/test 1.62.1→1.63.0**: [[playwright_version_docker_image_pin]]の通り、`.github/workflows/frontend-ci.yml`の`mcr.microsoft.com/playwright:v1.62.1-noble`を`v1.63.0-noble`に追従させる必要があった（CI失敗の直接原因）。タグの存在はWebSearchで確認済み。他にdevcontainer/docker-compose等でのPlaywrightバージョン固定箇所はリポジトリ内に存在しなかった。リリースノート上の破壊的変更（実験的コンポーネントテストパッケージの更新終了、Ubuntu 20.04サポート終了）はこのリポジトリの使い方に影響しない。
- **@biomejs/biome 2.5.11→2.5.13**: [[biome_schema_version_mismatch]]の$schema追従のみ（2.5.11→2.5.13）。
- **lucide-react 1.35.0→1.45.0**: 新規アイコン追加のみ（globe-code, calendar-chevrons-right等）、リネーム・削除なし。使用中のアイコン名はいずれも影響なし。
- **react/react-dom 19.2.8→19.3.0, @types/react/@types/react-dom 19.2.x→19.3.0**: React 19.3のリリースノートに破壊的変更の記載なし（`onBrowserBailout`オプション追加、Suspense関連のバグ修正等）。
- **oauth4webapi 3.8.7→3.8.8, @testing-library/user-event 14.6.6→14.6.7, @types/node 26.4.0→26.5.1, postcss 8.5.26→8.5.28, vite 8.2.2→8.3.0**: いずれもpatch更新で破壊的変更の記載なし。

**修正内容**: `orval.config.ts`に`mock.inline: true`を追加した上で`pnpm --filter @tasche/frontend openapi:update`を実行し`client.ts`を再生成（`client.msw.ts`は生成されないことを確認）。`.github/workflows/frontend-ci.yml`のPlaywright Dockerタグを`v1.63.0-noble`に更新。`packages/frontend/biome.json`の`$schema`を2.5.13に更新。それぞれ独立したコミットにした（本リポジトリの慣例）。

**検証結果**: `pnpm --filter @tasche/frontend lint`（biome check 165 files + tsc -b --noEmit）、`test`（vitest, 246 test全通過）、`build`（tsc -b && vite build）いずれも成功。E2Eはこのworktree環境ではdocker composeコンテナが未起動かつサンドボックスの制約（[[e2e_local_repro_under_sandbox]]）でローカル実行不可のためスキップし、CI側の確認に委ねた。

**Why**: orvalのようなコード生成ツールは`!`付きのbreaking change（メジャーバージョンを上げずマイナー内で導入されることがある）に注意が必要。今回は8.26.0→8.31.0というminor跨ぎの更新で、8.28.1というpatchリリースに破壊的変更が混入していた。dependabotのグループ更新はsemverのメジャー番号だけでなく、各パッケージのリリースノートを個別に確認しないと見落とす。

**How to apply**: orvalが含まれるグループ更新PRで`pnpm openapi:update`実行後に`client.msw.ts`や`client.faker.ts`のような新規untrackedファイルが出現したら、まず[[orval_upgrade_notes]]の`mock.inline`パターンを疑う。`@playwright/test`が含まれる場合は必ず[[playwright_version_docker_image_pin]]に従い`frontend-ci.yml`のDockerタグを追従させる。
