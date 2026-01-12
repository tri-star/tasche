# ダッシュボードページ実装計画

## 概要

デザイン案（dashboard.jpeg）に基づいて、優しくポップなUIのダッシュボードページを実装する。

## 前提条件

- **フロントエンドパス**: `packages/frontend`
- **APIクライアント**: Orvalで生成済み (`src/api/generated/client.ts`)
- **MSWモック**: 設定済み (`src/mocks/`)
- **shadcn/ui**: 基盤パッケージ導入済み、コンポーネント未導入

## デザイン構成

```
+------------------------------------------------------------------+
| [Tasche Logo]                                         [通知]      |
+------------+-----------------------------------------------------+
|            |  +--今日の目標--------+  +--実績を記録-----------+  |
| サイドバー  |  | [カレンダーicon]    |  | [クリップボードicon]   |  |
|            |  | 今日の目標  [illust]|  | 実績を記録    [illust]|  |
| * Dashboard|  | 2026年1月12日(月)   |  | [月][火][水]...       |  |
| * 目標設定 |  |                     |  | タスク選択ドロップダウン |  |
| * 設定     |  | [本] 試験勉強 2u □  |  | [-] 1.5 [+] units    |  |
|            |  | [鉛筆] 個人開発 2u □|  | [記録する]             |  |
|            |  +---------------------+  +------------------------+  |
|            |                                                      |
|            |  +--週間達成状況--------------------------------------+|
| * ヘルプ   |  |       月    火    水    木    金    土   日        ||
| * アカウント|  |試験勉強 100% 80%  30%  30%  120%                  ||
|            |  |個人開発  50% 80%  30%  80%  120%                  ||
|            |  |合計     100% 80%  30%  80%  120%                  ||
|            |  +---------------------------------------------------+|
|            |                                     [+ 目標設定] FAB  |
+------------+-----------------------------------------------------+
```

## 使用する画像アセット

| ファイル | 用途 | サイズ |
|---------|------|--------|
| logo.png | サイドバーロゴ | 高さ32px表示 |
| dashboard-widget-icon1.png | 今日の目標アイコン（カレンダー） | 52x57px → 28px表示 |
| dashboard-widget-icon2.png | 実績を記録アイコン（クリップボード） | 25x31px → 24px表示 |
| dashboard-widget-illust1.png | 今日の目標右上イラスト（緑時計） | 48px表示 |
| dashboard-widget-illust2.png | 実績を記録右上イラスト（オレンジ時計） | 48px表示 |
| task-icon.png | タスク名先頭（本） | 54x52px → 20px表示 |
| task-progress-sprites.png | 進捗スプライト | 18px×3 (若葉/芽/星) |

### 進捗スプライトの使用ルール
- 0〜49%: 若葉（offset: 0px）
- 50〜99%: 芽（offset: 18px）
- 100%〜: 星（offset: 36px）

## カラーパレット

| 用途 | HSL値 | 備考 |
|------|-------|------|
| プライマリ（緑） | `122 39% 49%` | #4CAF50相当 |
| 背景 | `0 0% 96%` | #F5F5F5 |
| カード | `0 0% 100%` | 白 |
| アクセント（薄緑） | `122 73% 93%` | #E8F5E9、サイドバー選択状態 |
| 達成率0% | 赤系 | bg-red-200 |
| 達成率50% | 黄系 | bg-yellow-100 |
| 達成率100% | 緑系 | bg-green-200 |

---

## 実装ステップ

### Phase 1: 環境準備（10分）

#### Step 1.1: CSS変数のカスタマイズ
**ファイル**: `packages/frontend/src/index.css`

`:root`内のCSS変数を以下に更新:
```css
--background: 0 0% 96%;
--primary: 122 39% 49%;
--accent: 122 73% 93%;
--accent-foreground: 122 39% 30%;
--radius: 0.75rem;
```

#### Step 1.2: shadcn/uiコンポーネントのインストール
```bash
cd packages/frontend
npx shadcn@latest add button card checkbox select table toggle-group
```

#### Step 1.3: 画像アセットの配置
```bash
mkdir -p packages/frontend/public/images/dashboard
cp docs/work-logs/20260112-dashboard-impl/images/logo.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-icon1.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-icon2.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-illust1.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-illust2.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/task-icon.png packages/frontend/public/images/dashboard/
cp docs/work-logs/20260112-dashboard-impl/images/task-progress-sprites.png packages/frontend/public/images/dashboard/
```

#### Step 1.4: Lucide Reactのインストール
```bash
pnpm add lucide-react
```

---

### Phase 2: レイアウトコンポーネント（20分）

#### Step 2.1: サイドバー
**ファイル**: `packages/frontend/src/components/layout/Sidebar.tsx`

**実装内容**:
- ロゴ画像（`/images/dashboard/logo.png`）を使用
- メインナビゲーション（Home, Target, Settings アイコン使用）
- 下部ナビゲーション（HelpCircle, User アイコン）
- 選択状態は `bg-accent` で薄緑背景

#### Step 2.2: ダッシュボードレイアウト
**ファイル**: `packages/frontend/src/components/layout/DashboardLayout.tsx`

**実装内容**:
- Sidebarを左側に配置
- 右上に通知ベルアイコン
- メインコンテンツ領域

---

### Phase 3: ウィジェットコンポーネント（80分）

#### Step 3.1: 今日の目標ウィジェット（20分）
**ファイル**: `packages/frontend/src/components/dashboard/TodayGoalsWidget.tsx`

**Props**:
```typescript
type TodayGoalsWidgetProps = {
  date: string;              // "2026年1月12日（月）"
  goals: TodayGoal[];        // API型を使用
  onToggleGoal?: (taskId: string, checked: boolean) => void;
};
```

**実装内容**:
- Card内にヘッダー（アイコン + タイトル + 日付）
- 右上にillust1
- タスクリスト（本アイコン + タスク名 + ユニット数 + チェックボックス）
- 右下に植物SVGイラスト

#### Step 3.2: 実績記録ウィジェット（25分）
**ファイル**: `packages/frontend/src/components/dashboard/RecordWidget.tsx`

**Props**:
```typescript
type RecordWidgetProps = {
  currentDay: DashboardResponseCurrentDayOfWeek;
  tasks: TodayGoal[];
  onRecord?: (day: string, taskId: string, units: number) => void;
};
```

**状態**:
- selectedDay: 選択中の曜日
- selectedTask: 選択中のタスクID
- units: 入力ユニット数（0.5刻み）

**実装内容**:
- ToggleGroupで曜日セレクタ（丸型ボタン）
- Selectでタスク選択
- カスタムスピンボタン（-/+ボタン付き）
- 「記録する」ボタン

#### Step 3.3: 週間達成状況マトリックス（30分）
**ファイル**: `packages/frontend/src/components/dashboard/WeeklyMatrix.tsx`

**Props**:
```typescript
type WeeklyMatrixProps = {
  data: WeeklyMatrixItem[];
  currentDay: DashboardResponseCurrentDayOfWeek;
};
```

**実装内容**:
- Tableコンポーネントベース
- ヘッダー行: 空 + 月〜日
- データ行: タスク名 + 各曜日の達成率セル
- 合計行: 各曜日の合計達成率
- セル色: 達成率に応じた背景色
- 進捗スプライト表示

**セル色計算関数**:
```typescript
function getCompletionColorClass(rate: number | null): string {
  if (rate === null) return "";
  if (rate === 0) return "bg-red-200";
  if (rate < 50) return "bg-red-100";
  if (rate < 80) return "bg-yellow-100";
  if (rate < 100) return "bg-yellow-50";
  return "bg-green-200";
}
```

#### Step 3.4: FABボタン（5分）
**ファイル**: `packages/frontend/src/components/dashboard/GoalSettingFab.tsx`

**実装内容**:
- fixed配置（右下）
- 緑背景の丸みを帯びたボタン
- Plusアイコン + 「目標設定」テキスト

---

### Phase 4: ページ実装（40分）

#### Step 4.1: MSWモックハンドラー（15分）
**ファイル**: `packages/frontend/src/mocks/handlers/dashboard.ts`

**実装内容**:
- デザインに合わせたモックデータ作成
- 3タスク（試験勉強、個人開発、後で読む消化）
- 各曜日の達成率データ

**handlers/index.ts更新**:
- dashboardHandlersをインポートして追加

#### Step 4.2: ダッシュボードページ（20分）
**ファイル**: `packages/frontend/src/pages/DashboardPage.tsx`

**実装内容**:
- useEffectでAPIデータ取得
- ローディング/エラー状態の処理
- ウィジェット配置（グリッドレイアウト）
- 実績記録ハンドラー

#### Step 4.3: App.tsx更新（5分）
**ファイル**: `packages/frontend/src/App.tsx`

**実装内容**:
- DashboardPageをインポートして表示

---

### Phase 5: テスト実装（30分）

#### Step 5.1: Testing Libraryインストール（5分）
```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### Step 5.2: テストセットアップ更新（5分）
**ファイル**: `packages/frontend/src/test/setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";
```

**ファイル**: `packages/frontend/vitest.config.ts`
- `globals: true` を追加
- エイリアス設定を追加

#### Step 5.3: ページテスト（20分）
**ファイル**: `packages/frontend/src/pages/DashboardPage.test.tsx`

**テストケース**:
1. ダッシュボードページが正常にレンダリングされる
2. サイドバーのナビゲーションが表示される

---

## 最終ファイル構成

```
packages/frontend/
├── public/images/dashboard/
│   ├── logo.png
│   ├── dashboard-widget-icon1.png
│   ├── dashboard-widget-icon2.png
│   ├── dashboard-widget-illust1.png
│   ├── dashboard-widget-illust2.png
│   ├── task-icon.png
│   └── task-progress-sprites.png
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (自動生成)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── toggle-group.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   └── dashboard/
│   │       ├── TodayGoalsWidget.tsx
│   │       ├── RecordWidget.tsx
│   │       ├── WeeklyMatrix.tsx
│   │       └── GoalSettingFab.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   └── DashboardPage.test.tsx
│   ├── mocks/handlers/
│   │   ├── index.ts             # 更新
│   │   └── dashboard.ts         # 新規
│   ├── App.tsx                  # 更新
│   └── index.css                # 更新
└── vitest.config.ts             # 更新
```

---

## 検証手順

### 1. 開発サーバー起動
```bash
cd packages/frontend
VITE_USE_MSW=true pnpm dev
```

### 2. ブラウザで確認
- http://localhost:5173 にアクセス
- ダッシュボードが表示されることを確認
- 各ウィジェットの表示を確認
- 曜日選択、タスク選択、ユニット入力の動作確認

### 3. テスト実行
```bash
pnpm test
```

---

## 注意事項

1. **型の参照**: `@/api/generated/model` からインポート
2. **MSWモック**: カスタムハンドラーはOrval生成ハンドラーより先に登録
3. **スプライト表示**: `background-position` でオフセット指定
4. **レスポンシブ**: モバイルではサイドバーを非表示にする対応は後日

## 参考ファイル

- `packages/frontend/src/api/generated/model/dashboardResponse.ts` - API型定義
- `packages/frontend/src/api/generated/client.ts` - APIクライアント関数
- `docs/components.md` - コンポーネント設計ガイド
