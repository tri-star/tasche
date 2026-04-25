# Tasche 初期コンポーネント一覧

このドキュメントは、MVP開発で必要となるUIコンポーネントを定義します。

## 技術スタック

| 項目 | 技術 |
|------|------|
| スタイリング | Tailwind CSS |
| UIコンポーネント基盤 | shadcn/ui（Radix UIベース） |
| アイコン | Lucide React（shadcn/ui標準） |

---

## コンポーネント分類

```
src/components/
├── ui/                  # shadcn/ui ベースコンポーネント
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── common/              # アプリ共通コンポーネント
│   ├── Header.tsx
│   ├── ThemeToggle.tsx
│   ├── DaySelector.tsx
│   └── ...
├── login/               # ログイン画面専用コンポーネント
│   ├── LoginLayout.tsx       # ページ全体レイアウト
│   ├── LoginBackground.tsx   # 背景ブロブ + 四隅装飾 SVG 配置
│   ├── TascheLogo.tsx        # バッグロゴ + Tasche テキスト
│   ├── GoogleLoginButton.tsx # Google でログイン ボタン
│   ├── StubLoginButton.tsx   # スタブログインボタン（開発/E2E 専用）
│   └── LoginFooter.tsx       # フッターリンク
├── routing/             # ルーティング関連
│   └── ProtectedRoute.tsx    # 未認証時 /login へリダイレクト
├── dashboard/           # ダッシュボード用
│   ├── TodayGoalWidget.tsx
│   ├── WeeklyMatrix.tsx
│   └── ...
├── goals/               # 目標設定用
│   ├── GoalWizard.tsx
│   └── ...
└── tasks/               # タスク管理用
    ├── TaskList.tsx
    └── ...
```

---

## shadcn/ui から導入するコンポーネント

### 基本入力系

| コンポーネント | 用途 | インストールコマンド |
|---------------|------|---------------------|
| Button | 各種ボタン | `npx shadcn@latest add button` |
| Input | テキスト入力 | `npx shadcn@latest add input` |
| Label | フォームラベル | `npx shadcn@latest add label` |
| Checkbox | タスク選択 | `npx shadcn@latest add checkbox` |
| RadioGroup | ユニット時間選択 | `npx shadcn@latest add radio-group` |
| Switch | ダークモード切替 | `npx shadcn@latest add switch` |

### 選択・リスト系

| コンポーネント | 用途 | インストールコマンド |
|---------------|------|---------------------|
| Select | 基本セレクト | `npx shadcn@latest add select` |
| Combobox | タスク選択（フィルター付き） | `npx shadcn@latest add command` + `popover` |
| DropdownMenu | ユーザーメニュー | `npx shadcn@latest add dropdown-menu` |
| Tabs | タブ切替（汎用） | `npx shadcn@latest add tabs` |
| ToggleGroup | 曜日セレクタ（DaySelector） | `npx shadcn@latest add toggle-group` |

### フィードバック・オーバーレイ系

| コンポーネント | 用途 | インストールコマンド |
|---------------|------|---------------------|
| Dialog | 汎用モーダル | `npx shadcn@latest add dialog` |
| AlertDialog | 削除確認 | `npx shadcn@latest add alert-dialog` |
| Toast | 通知表示 | `npx shadcn@latest add toast` |
| Tooltip | ヘルプ表示 | `npx shadcn@latest add tooltip` |

### レイアウト・表示系

| コンポーネント | 用途 | インストールコマンド |
|---------------|------|---------------------|
| Card | ウィジェット枠 | `npx shadcn@latest add card` |
| Table | 週間マトリックス | `npx shadcn@latest add table` |
| Separator | 区切り線 | `npx shadcn@latest add separator` |
| ScrollArea | スクロール領域 | `npx shadcn@latest add scroll-area` |

### フォーム系

| コンポーネント | 用途 | インストールコマンド |
|---------------|------|---------------------|
| Form | フォームバリデーション | `npx shadcn@latest add form` |

---

## カスタムコンポーネント（自前実装）

shadcn/ui に存在しない、または大幅なカスタマイズが必要なコンポーネント。

### CUSTOM-01: SpinButton（スピンボタン付き数値入力）

**用途**: 実績ユニット数の入力（0.1刻み）

**要件**:
- 0.1単位で増減
- 上下ボタン（▲▼）
- キーボード操作（上下キー）
- 最小値: 0、最大値: 制限なし
- 小数点第1位まで表示

**UI案**:
```
┌───────────────────────────┐
│    1.5    │  ▲  │  ▼  │
└───────────────────────────┘
```

**実装方針**: shadcn/ui の Input + Button を組み合わせ

---

### CUSTOM-02: GoalWizardStepper（ウィザードステッパー）

**用途**: 目標設定画面のステップ表示

**要件**:
- 4ステップ表示（ユニット時間選択 → タスク選択 → 曜日別設定 → 確認）
- 現在のステップをハイライト
- 完了したステップにチェックマーク
- ステップ間の線で接続

**UI案**:
```
  ①────②────③────④
  ✓    ●    ○    ○
 時間  タスク 配分  確認
```

**実装方針**: Tailwind CSSで自前実装

---

### CUSTOM-03: WeeklyMatrix（週間達成状況マトリックス）

**用途**: ダッシュボードで週間の達成状況を表形式で表示

**要件**:
- 行: タスク名
- 列: 曜日（月〜日）
- セル: 消化率（%）+ 色（0%=赤、100%=緑、グラデーション）
- 今日の列をハイライト
- レスポンシブ対応（モバイルでは横スクロール）

**UI案**:
```
         │  月  │  火  │  水  │  木  │  金  │  土  │  日  │
─────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
英語学習 │ 100% │  50% │   0% │   -  │   -  │   -  │   -  │
         │  🟢  │  🟡  │  🔴  │      │      │      │      │
─────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
読書     │ 150% │ 100% │   -  │   -  │   -  │   -  │   -  │
         │  🟢  │  🟢  │      │      │      │      │      │
```

**実装方針**: shadcn/ui の Table をベースにカスタマイズ

---

### CUSTOM-04: TaskCombobox（タスク選択コンボボックス）

**用途**: 実績登録時のタスク選択

**実装ファイル**: `packages/frontend/src/components/common/TaskCombobox.tsx`

**要件**:
- テキスト入力でフィルタリング（大文字小文字を無視した部分一致）
- ドロップダウンでタスク一覧表示
- キーボード操作: ArrowDown/Up（候補移動）、Enter（決定）、Escape（クローズ）、Space/ArrowDown（トリガーからオープン）
- 選択中のタスクをトリガーに表示

**実装方針**: shadcn/ui の Command/Popover は使用せず、`<button>` トリガー + 検索 `<input>` + `role="listbox"` の自前実装。外側クリック・Escape で閉じる。

**Props**:
```typescript
export type TaskComboboxTask = {
  id: string
  name: string
}

export type TaskComboboxProps = {
  tasks: TaskComboboxTask[]     // 候補タスク一覧（アーカイブ除外済みを期待）
  value: string                 // 選択中のタスクID（未選択は ""）
  onChange: (taskId: string) => void
  placeholder?: string          // 未選択時のプレースホルダ（デフォルト: "タスクを選択..."）
  searchPlaceholder?: string    // フィルタ入力欄のプレースホルダ（デフォルト: "タスクを検索..."）
  emptyLabel?: string           // 該当なし時のテキスト（デフォルト: "該当するタスクがありません"）
  disabled?: boolean
  className?: string
  ariaLabel?: string
}
```

---

### CUSTOM-05: DaySelector（曜日セレクタ）

**用途**: 実績登録時の曜日選択

**要件**:
- 今週の7曜日を月曜始まり（MVP固定）で表示
- 各曜日に日付を併記（例: 月 1/15）
- 単一選択・常に1つ選択されている（選択解除なし）
- `currentDay` prop を指定した曜日に「今日」ハイライト（`ring` + ドット）を表示
  - 今日の初期選択は呼び出し元（`RecordWidget` など）の責務
- `aria-current="date"` で今日を非視覚的にも識別可能

**Props**:
```typescript
type DaySelectorProps = {
  weekStartDate: string     // YYYY-MM-DD（月曜前提）
  currentDay?: DayOfWeek    // 今日の曜日。指定時にハイライトを付与
  value: DayOfWeek          // 現在選択されている曜日（制御コンポーネント）
  onChange: (day: DayOfWeek) => void
  className?: string
  ariaLabelPrefix?: string  // デフォルト「曜日」
}
```

**UI案**:
```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ 月  │ 火  │ 水  │ 木  │ 金  │ 土  │ 日  │
│1/13 │1/14 │1/15 │1/16 │1/17 │1/18 │1/19 │
│     │     │ ●  │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```
（●: 今日ハイライト、選択状態は `bg-primary` で強調）

**実装方針**: shadcn/ui の ToggleGroup（`type="single"`）をベースにカスタマイズ。週日付計算は `src/lib/week-dates.ts` の `buildWeekDates()` を使用

---

## 共通コンポーネント

### COMMON-01: Header

**用途**: 全画面共通のヘッダー

**構成要素**:
- ロゴ（クリックでダッシュボードへ）
- ナビゲーションリンク（タスク管理、設定）
- ダークモード切替（Switch）
- ユーザーメニュー（DropdownMenu）

---

### COMMON-02: ThemeProvider

**用途**: ダークモード対応のテーマ管理

**実装方針**: next-themes または自前のContext実装

---

### COMMON-03: PageLayout

**用途**: 各ページの共通レイアウト

**構成要素**:
- Header
- メインコンテンツ領域
- （オプション）フッター

---

## 初期インストールコマンド（一括）

```bash
# shadcn/ui 初期化
npx shadcn@latest init

# 基本コンポーネント
npx shadcn@latest add button input label checkbox radio-group switch

# 選択・リスト系
npx shadcn@latest add select command popover dropdown-menu tabs toggle-group

# フィードバック系
npx shadcn@latest add dialog alert-dialog toast tooltip

# レイアウト系
npx shadcn@latest add card table separator scroll-area

# フォーム系
npx shadcn@latest add form
```

---

## 優先度

### Phase 1（MVP必須）

| コンポーネント | 種別 |
|---------------|------|
| Button | shadcn/ui |
| Input | shadcn/ui |
| Checkbox | shadcn/ui |
| RadioGroup | shadcn/ui |
| Switch | shadcn/ui |
| Card | shadcn/ui |
| Table | shadcn/ui |
| Dialog | shadcn/ui |
| AlertDialog | shadcn/ui |
| Tabs / ToggleGroup | shadcn/ui |
| DropdownMenu | shadcn/ui |
| Toast | shadcn/ui |
| SpinButton | カスタム |
| WeeklyMatrix | カスタム |
| TaskCombobox | カスタム |
| DaySelector | カスタム |
| GoalWizardStepper | カスタム |
| LoginLayout | ログイン |
| LoginBackground | ログイン |
| TascheLogo | ログイン |
| GoogleLoginButton | ログイン |
| StubLoginButton | ログイン |
| ProtectedRoute | ルーティング |
| Header | 共通 |
| ThemeProvider | 共通 |

### Phase 2（改善・追加）

| コンポーネント | 種別 |
|---------------|------|
| Tooltip | shadcn/ui |
| ScrollArea | shadcn/ui |
| Form（バリデーション強化） | shadcn/ui |
