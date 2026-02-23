---
name: frontend-context
description: "Tascheフロントエンドの共通コンテキスト。プロジェクト構造、技術スタック、コーディング規約への参照を提供する。"
user-invokable: false
---

# Tascheフロントエンド 共通コンテキスト

## 必読ドキュメント

以下のドキュメントを必要に応じて参照すること。

| パス | 概要 |
|:--|:--|
| `docs/concept.md` | プロジェクトの目的とコンセプト |
| `docs/glossary.md` | ドメイン用語の定義 |
| `docs/mvp.md` | MVP要件の定義 |
| `docs/screens.md` | 画面設計・画面遷移 |
| `docs/components.md` | コンポーネント設計 |
| `docs/api-design.md` | APIエンドポイント設計 |
| `docs/adr/ADR001-frontend-env-design.md` | フロントエンド環境設計のADR |
| `docs/adr/ADR002-frontend-deploy.md` | フロントエンドデプロイのADR |

## FE設定ファイル

| パス | 概要 |
|:--|:--|
| `packages/frontend/README.md` | 開発環境セットアップ手順・コマンド一覧 |
| `packages/frontend/package.json` | 依存関係・スクリプト定義 |

## ソースコード構造

```
packages/frontend/src/
├── components/
│   ├── ui/            # shadcn/uiベースの汎用UIコンポーネント
│   ├── layout/        # レイアウトコンポーネント（Sidebar, DashboardLayout）
│   ├── dashboard/     # ダッシュボード画面のコンポーネント
│   └── goals/         # 目標設定画面のコンポーネント
├── pages/             # ページコンポーネント（ルーティング単位）
├── api/generated/     # Orvalで自動生成されたAPIクライアント・型定義（手動編集禁止）
├── mocks/             # MSW (Mock Service Worker) のハンドラ・設定
├── lib/               # ユーティリティ関数
├── test/              # テスト設定（setup.ts）
└── e2e/               # E2Eテスト（Playwright）
```

## コマンド一覧

`packages/frontend/` ディレクトリで実行：

| コマンド | 説明 |
|:--|:--|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm test` | Vitestでユニットテスト実行 |
| `pnpm lint` | Biome check + TypeScriptコンパイルチェック |
| `pnpm format` | Biome check --write で自動フォーマット |
| `pnpm openapi:update` | OpenAPI定義からOrvalでAPIクライアント再生成 |
| `pnpm test:e2e` | Playwright E2Eテスト実行（実API） |
| `pnpm test:e2e:ui` | Playwright UIモードでE2Eテスト実行 |

## コーディング規約

- **Linter/Formatter**: Biome準拠。`pnpm lint` / `pnpm format` で確認・修正
- **スタイリング**: Tailwind CSS + CSS変数。ダークモードは `class` 方式
- **UIコンポーネント**: shadcn/ui を活用。`components/ui/` 配下のコンポーネントを利用
- **API型定義**: Orvalで生成された型（`api/generated/model/`）を使用。手動で型を作らない
- **APIクライアント**: `api/generated/client.ts` のOrval生成関数を使用
- **モック**: MSW (Mock Service Worker) で `mocks/handlers/` にハンドラを定義
- **テスト**: Vitest + Testing Library。`test/setup.ts` でグローバル設定
