# E2Eテストガイド

このディレクトリには、Playwrightを使用したE2Eテストの共通コードが含まれています。

## ディレクトリ構成

```
src/e2e/
├── fixtures/           # テストフィクスチャ
│   ├── auth.ts        # 認証済みページのフィクスチャ
│   └── test-data.ts   # テストデータ定義
├── pages/             # ページオブジェクト
│   ├── dashboard.page.ts
│   └── goal-setting.page.ts
├── global-setup.ts    # グローバルセットアップ（実APIモード用）
└── README.md          # このファイル
```

## テストモード

### MSWモード（デフォルト）

MSW (Mock Service Worker) を使用してAPIリクエストをモックします。バックエンドが不要で、高速に実行できます。

```bash
# MSWモードでテスト実行
pnpm test:e2e

# UIモードでデバッグ
pnpm test:e2e:ui
```

### 実APIモード

実際のバックエンドAPIに接続してテストを実行します。バックエンドが起動している必要があります。

```bash
# バックエンドを起動（別ターミナル）
# ENABLE_TEST_AUTH=true で起動すること
docker-compose up -d

# 実APIモードでテスト実行
pnpm test:e2e:api
```

## テストの書き方

### 1. ページオブジェクトの使用

テストコードは `src/pages/` ディレクトリに配置し、ページオブジェクトを使用してページ操作を抽象化します。

```typescript
import { test, expect } from "@/e2e/fixtures/auth"
import { DashboardPage } from "@/e2e/pages/dashboard.page"

test("ダッシュボードが表示される", async ({ authenticatedPage }) => {
  const dashboardPage = new DashboardPage(authenticatedPage)
  await dashboardPage.goto()
  await dashboardPage.waitForLoaded()

  await expect(dashboardPage.todayGoalsTitle).toBeVisible()
})
```

### 2. フィクスチャの使用

`authenticatedPage` フィクスチャを使用すると、認証済みの状態でテストを開始できます。

```typescript
test("テスト名", async ({ authenticatedPage }) => {
  // authenticatedPageは認証済みの状態で使用できる
  await authenticatedPage.goto("/")
})
```

### 3. テストデータの使用

`test-data.ts` で定義されたテストデータを使用します。

```typescript
import { testUser, testTaskIds } from "@/e2e/fixtures/test-data"

// テスト内で使用
console.log(testUser.email) // test@example.com
console.log(testTaskIds.task1) // tsk_01HXYZ1234567890ABCDEF
```

## CI/CD

GitHub Actionsで自動的にE2Eテストが実行されます。

- **テストモード**: MSWモード
- **失敗時**: Playwrightレポートがアーティファクトとして保存されます

## トラブルシューティング

### テストが失敗する場合

1. **MSWモードでの失敗**
   - `src/mocks/handlers/` のモックデータを確認
   - ページオブジェクトのセレクタが正しいか確認

2. **実APIモードでの失敗**
   - バックエンドが `ENABLE_TEST_AUTH=true` で起動しているか確認
   - APIエンドポイントが正しいか確認

### デバッグ方法

```bash
# UIモードでデバッグ
pnpm test:e2e:ui

# ヘッドフルモードで実行（ブラウザが表示される）
pnpm exec playwright test --headed

# 特定のテストのみ実行
pnpm exec playwright test DashboardPage
```

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
