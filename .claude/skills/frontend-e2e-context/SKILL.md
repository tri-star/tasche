---
name: frontend-e2e-context
description: "TascheフロントエンドE2Eテストのコンテキスト。Playwright設定、フィクスチャ、ページオブジェクトへの参照を提供する。"
user-invokable: false
---

# Tascheフロントエンド E2Eテストコンテキスト

## 必読ドキュメント

| パス | 概要 |
|:--|:--|
| `packages/frontend/src/e2e/README.md` | E2Eテストのセットアップ・規約・実行方法 |

## 設定ファイル

| パス | 概要 |
|:--|:--|
| `packages/frontend/playwright.config.ts` | Playwright設定。MSW/実APIモード切替を含む |

## フィクスチャ

| パス | 概要 |
|:--|:--|
| `packages/frontend/src/e2e/fixtures/auth.ts` | 認証済みページフィクスチャ（authenticatedPage） |
| `packages/frontend/src/e2e/fixtures/test-data.ts` | テストデータ生成ヘルパー |

## ページオブジェクト

| パス | 概要 |
|:--|:--|
| `packages/frontend/src/e2e/pages/dashboard.page.ts` | ダッシュボード画面のページオブジェクト |
| `packages/frontend/src/e2e/pages/goal-setting.page.ts` | 目標設定画面のページオブジェクト |

## ユーティリティ

| パス | 概要 |
|:--|:--|
| `packages/frontend/src/e2e/utils/test-auth.ts` | テスト認証ユーティリティ |
| `packages/frontend/src/e2e/global-setup.ts` | グローバルセットアップ |

## テストファイル

テストファイルは `packages/frontend/src/e2e/` 配下に `*.e2e.spec.ts` パターンで配置。

## E2Eコマンド

`packages/frontend/` ディレクトリで実行：

| コマンド | 説明 |
|:--|:--|
| `pnpm test:e2e` | 実API接続でE2Eテスト実行 |
| `pnpm test:e2e:ui` | PlaywrightのUIモードでE2Eテスト実行 |

## E2E規約

- **認証**: `authenticatedPage` フィクスチャを使用してログイン済みコンテキストを取得
- **MSW skip**: 実APIモード（`E2E_USE_MSW=false`）ではMSWをバイパス
- **セレクタ**: セマンティックセレクタ（`getByRole`, `getByText`, `getByLabel`）を優先。`data-testid` は最終手段
- **ファイル配置**: テストは `src/e2e/` 直下、ページオブジェクトは `src/e2e/pages/`、フィクスチャは `src/e2e/fixtures/`
- **ページオブジェクトパターン**: 画面操作は必ずページオブジェクトを通じて行う。直接のセレクタ操作をテストコードに書かない
