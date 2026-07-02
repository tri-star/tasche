---
name: vitejs-plugin-react-v6-vite8-requirement
description: "@vitejs/plugin-react v6系はpeerDependenciesでvite ^8.0.0を要求し、vite 7系だとbuildが実際に失敗する（PR #70で確認）"
metadata:
  type: project
---

`@vitejs/plugin-react` は v6.0.0 以降、`peerDependencies` で `vite: ^8.0.0` を要求する（v5.x までは `vite: ^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0`）。

`packages/frontend` はまだ `vite: ^7.2.4` を使用しているため、Dependabot PR #70（`@vitejs/plugin-react` 5.1.2 → 6.0.3）を単独でマージすると、`pnpm install` 後に実際に `vite build` が

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './internal' is not defined by "exports" in vite/package.json
```

で失敗する。これは警告ではなく実行時エラーで、`pnpm-lock.yaml` のpeerDependencies宣言だけでなく実ビルドでも再現確認済み（2026-07-02時点、vite 7.3.1 / plugin-react 6.0.3）。

**Why:** dependabot-update-workflow ではpackage.json/lockfileの差分だけでなく `pnpm install` 後に実際に `node_modules` を最新化してから `build` まで通す必要がある。lint/testだけだと `vite.config.ts` を経由しないため気づけないケースがある（今回はlint/testはパスしたがbuildだけ失敗した）。

**How to apply:**
- `@vitejs/plugin-react` の更新PRを見たら、Vite本体のバージョンとの整合性を必ず確認する（`pnpm-lock.yaml` 内の対象パッケージの `peerDependencies` セクションを見れば要求バージョンが分かる）。
- Vite本体がまだ7系のままなら、plugin-reactのv6系アップデートは単独ではマージ不可と判断し、Vite 8への移行（別タスク）が先に必要である旨を報告する。
- Vite 8自体はバンドラーがesbuild+RollupからRolldownに置き換わるなど大規模な破壊的変更を含むメジャーアップグレードのため、plugin-react更新のついでに一緒に上げるのは「必要最小限の修正」の範囲を超える。
