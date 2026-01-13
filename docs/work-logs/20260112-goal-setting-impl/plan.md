# 目標設定画面（Goal Setting Page）実装プラン

## 概要

目標設定画面（`/goals`）をウィザード形式で実装する。4つのステップで構成され、ユーザーが今週の目標を設定できるようにする。

## 画面構成（ウィザードステップ）

デザイン画像を基に、以下の4ステップで構成:

1. **Step 1: ユニット時間選択** - 1ユニットの時間を選択（10分/30分/1時間/2時間）
2. **Step 2: タスク選択** - 今週取り組むタスクを選択（既存タスク選択 or 新規作成）
3. **Step 3: 曜日別目標設定** - 各タスクの曜日ごとの目標ユニット数を設定
4. **Step 4: 確認** - 設定内容を確認して保存

---

## 使用API

### 1. タスク関連
| エンドポイント | メソッド | 用途 |
|--------------|---------|------|
| `/api/tasks` | GET | タスク一覧取得 |
| `/api/tasks` | POST | 新規タスク作成 |
| `/api/tasks/{task_id}` | PUT | タスク名更新 |
| `/api/tasks/{task_id}` | DELETE | タスク削除（アーカイブ） |

### 2. 目標関連
| エンドポイント | メソッド | 用途 |
|--------------|---------|------|
| `/api/weeks/current/goals` | GET | 今週の目標取得（編集時の初期値用） |
| `/api/weeks/current/goals` | PUT | 目標一括更新（保存時） |

### API型定義（参照用）

```typescript
// タスク一覧取得レスポンス
interface TaskListResponse {
  tasks: TaskResponse[];
}

interface TaskResponse {
  id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// 目標更新リクエスト
interface GoalsUpdate {
  unit_duration_minutes: number; // 10, 30, 60, 120
  goals: GoalUpdateItem[];
}

interface GoalUpdateItem {
  task_id: string | null;      // nullの場合は新規タスク作成
  new_task_name?: string;      // task_idがnullの場合に必須
  daily_targets: DailyTargets;
}

interface DailyTargets {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}
```

---

## ファイル構成

```
packages/frontend/src/
├── pages/
│   └── GoalSettingPage.tsx          # 新規作成: メインページコンポーネント
├── components/
│   └── goals/                       # 新規ディレクトリ
│       ├── GoalWizard.tsx           # ウィザード全体のコンテナ
│       ├── StepIndicator.tsx        # ステップインジケーター
│       ├── Step1UnitDuration.tsx    # Step 1: ユニット時間選択
│       ├── Step2TaskSelection.tsx   # Step 2: タスク選択
│       ├── Step3WeeklyTargets.tsx   # Step 3: 曜日別目標設定
│       ├── Step4Confirmation.tsx    # Step 4: 確認画面
│       ├── TaskItem.tsx             # タスク選択用のアイテムコンポーネント
│       ├── WeeklyTargetGrid.tsx     # 週間目標設定グリッド
│       └── TaskBlock.tsx            # グリッド内のタスクブロック
├── mocks/
│   └── handlers/
│       └── goals.ts                 # 新規作成: 目標設定用MSWハンドラー
└── App.tsx                          # ルーティング追加
```

---

## 実装詳細

### Phase 1: 基盤整備

#### 1-1. ルーティング設定
**ファイル**: `packages/frontend/src/App.tsx`

```tsx
// React Routerの導入（未導入の場合）
// /goals ルートを追加
```

#### 1-2. MSWハンドラー作成
**ファイル**: `packages/frontend/src/mocks/handlers/goals.ts`

```typescript
import { http, HttpResponse } from "msw";
import type {
  APIResponseTaskListResponse,
  APIResponseGoalsResponse,
  APIResponseGoalsUpdateResponse,
} from "@/api/generated/model";

// モックデータ
const mockTasks: APIResponseTaskListResponse = {
  data: {
    tasks: [
      { id: "tsk_01", name: "英語学習", is_archived: false, created_at: "...", updated_at: "..." },
      { id: "tsk_02", name: "個人開発", is_archived: false, created_at: "...", updated_at: "..." },
      { id: "tsk_03", name: "読書", is_archived: false, created_at: "...", updated_at: "..." },
      { id: "tsk_04", name: "筋トレ", is_archived: false, created_at: "...", updated_at: "..." },
      { id: "tsk_05", name: "ブログ執筆", is_archived: false, created_at: "...", updated_at: "..." },
    ],
  },
};

const mockGoals: APIResponseGoalsResponse = {
  data: {
    week_id: "wk_01",
    unit_duration_minutes: 60,
    goals: [], // 初回は空
  },
};

export const goalsHandlers = [
  // タスク一覧取得
  http.get("*/api/tasks", () => HttpResponse.json(mockTasks)),

  // タスク作成
  http.post("*/api/tasks", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: `tsk_${Date.now()}`,
        name: body.name,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  // タスク更新
  http.put("*/api/tasks/:taskId", async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: params.taskId,
        name: body.name,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  // タスク削除
  http.delete("*/api/tasks/:taskId", ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.taskId,
        name: "deleted",
        is_archived: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  // 現在の目標取得
  http.get("*/api/weeks/current/goals", () => HttpResponse.json(mockGoals)),

  // 目標更新
  http.put("*/api/weeks/current/goals", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        week_id: "wk_01",
        unit_duration_minutes: body.unit_duration_minutes,
        goals: body.goals.map((g, i) => ({
          task_id: g.task_id || `tsk_new_${i}`,
          task_name: g.new_task_name || `Task ${i}`,
          daily_targets: g.daily_targets,
        })),
        created_tasks: body.goals
          .filter(g => !g.task_id)
          .map((g, i) => ({ id: `tsk_new_${i}`, name: g.new_task_name })),
      },
    });
  }),
];
```

handlers/index.ts に追加:
```typescript
import { goalsHandlers } from "./goals";
// ...
export const handlers = [...dashboardHandlers, ...goalsHandlers, ...generatedHandlers];
```

---

### Phase 2: コンポーネント実装

#### 2-1. GoalSettingPage（メインページ）
**ファイル**: `packages/frontend/src/pages/GoalSettingPage.tsx`

- DashboardLayoutを使用
- GoalWizardコンポーネントをレンダリング

#### 2-2. GoalWizard（ウィザードコンテナ）
**ファイル**: `packages/frontend/src/components/goals/GoalWizard.tsx`

**状態管理**:
```typescript
interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  unitDurationMinutes: number;      // 10, 30, 60, 120
  selectedTaskIds: string[];        // 選択されたタスクID
  newTasks: { tempId: string; name: string }[]; // 新規作成タスク
  weeklyTargets: Map<string, DailyTargets>;     // タスクIDごとの目標
}
```

**主な機能**:
- ステップ間のナビゲーション制御
- 状態の集約管理
- 保存処理（PUT /api/weeks/current/goals）

#### 2-3. StepIndicator（ステップインジケーター）
**ファイル**: `packages/frontend/src/components/goals/StepIndicator.tsx`

**デザイン仕様**（step1.jpegより）:
- 4ステップを横並びで表示
- 現在のステップは黄色い背景でハイライト
- ステップ名: 「1. ユニット時間選択」「2. タスク選択」「3. 曜日別目標設定」「4. 確認」
- 角丸のピル型タブスタイル

```tsx
interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  steps: { number: number; label: string }[];
}
```

#### 2-4. Step1UnitDuration（ユニット時間選択）
**ファイル**: `packages/frontend/src/components/goals/Step1UnitDuration.tsx`

**デザイン仕様**（step1.jpegより）:
- 中央上部にイラスト画像（`step1-illust.png`）
- 見出し: 「1ユニットの時間を選んでください」
- 4つの選択肢（カード形式、ラジオボタン付き）:
  - 10分 - "For short tasks"（step1-option-1.png）
  - 30分 - "Standard work block"（step1-option-2.png）
  - 1時間 - "Focused session"（step1-option-3.png）
  - 2時間 - "Deep work"（step1-option-4.png）
- 選択中のカードは緑色のボーダーとチェックマーク
- 下部: 「キャンセル」ボタン（グレー）、「次へ →」ボタン（緑色）

```tsx
interface Step1Props {
  value: number;
  onChange: (minutes: number) => void;
  onNext: () => void;
  onCancel: () => void;
}
```

#### 2-5. Step2TaskSelection（タスク選択）
**ファイル**: `packages/frontend/src/components/goals/Step2TaskSelection.tsx`

**デザイン仕様**（step2.jpegより）:
- 中央上部にイラスト画像（`step-2-illust.png`）
- 見出し: 「今週取り組むタスクを選んでください」
- タスク一覧（グリッドレイアウト、3列）:
  - 各タスクはカード形式
  - 左側にチェックボックス
  - タスク名
  - 右側に編集アイコン（ペン）と削除アイコン（ゴミ箱）
- 「+ 新しいタスクを追加」カード（右下）
- 下部: 「← 戻る」ボタン、「次へ →」ボタン

```tsx
interface Step2Props {
  tasks: TaskResponse[];
  selectedTaskIds: string[];
  newTasks: { tempId: string; name: string }[];
  onToggleTask: (taskId: string) => void;
  onAddNewTask: (name: string) => void;
  onEditTask: (taskId: string, newName: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**API呼び出し**:
- 初期表示時: `GET /api/tasks`
- 新規追加時: ローカル状態に追加（保存時にまとめてAPIに送信）
- 編集時: `PUT /api/tasks/{task_id}`（既存タスクの場合）
- 削除時: `DELETE /api/tasks/{task_id}`（既存タスクの場合）

#### 2-6. Step3WeeklyTargets（曜日別目標設定）
**ファイル**: `packages/frontend/src/components/goals/Step3WeeklyTargets.tsx`

**デザイン仕様**（step3.jpegより）:
- 見出し: 「各タスクの曜日ごとの目標を設定」
- 2カラムレイアウト:
  - 左側: 選択したタスク一覧（ドラッグハンドル付き）
    - タスク名の左にアイコン（`task-icon.png`を使用）
    - 右側にハンバーガーメニュー（並び替え用）
  - 右側: 週間目標設定グリッド
    - ヘッダー: 月、火、水、木、金、土、日、合計
    - 行: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0 ユニット
    - タスクブロックをドラッグ&ドロップで配置
    - 各タスクはユニット数に応じた高さで表示
    - ブロックの上下端をドラッグして0.5unit単位で調整可能
    - 最下行に各曜日の合計ユニット数を表示
- 下部: 「← 戻る」ボタン、「次へ →」ボタン

**複雑なインタラクション**:
- ドラッグ&ドロップでタスクを曜日に配置
- ブロックのリサイズで目標ユニット数を調整
- react-dnd または @dnd-kit/core の使用を検討

```tsx
interface Step3Props {
  tasks: Array<{ id: string; name: string; isNew?: boolean }>;
  weeklyTargets: Map<string, DailyTargets>;
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**簡易実装オプション**（ドラッグ&ドロップが複雑な場合）:
- テーブル形式でタスク×曜日のマトリックス
- 各セルにSpinButton（数値入力）を配置

#### 2-7. Step4Confirmation（確認画面）
**ファイル**: `packages/frontend/src/components/goals/Step4Confirmation.tsx`

**デザイン仕様**（デザイン画像なし、仕様から推測）:
- 設定内容のサマリー表示:
  - ユニット時間
  - 選択したタスク一覧
  - 各タスクの曜日別目標（表形式）
- 下部: 「← 戻る」ボタン、「保存」ボタン（緑色）

```tsx
interface Step4Props {
  unitDurationMinutes: number;
  tasks: Array<{ id: string; name: string; isNew?: boolean }>;
  weeklyTargets: Map<string, DailyTargets>;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
}
```

---

### Phase 3: 共通コンポーネント

#### 3-1. TaskItem（タスクアイテム）
**ファイル**: `packages/frontend/src/components/goals/TaskItem.tsx`

```tsx
interface TaskItemProps {
  id: string;
  name: string;
  isSelected: boolean;
  isNew?: boolean;
  onToggle: () => void;
  onEdit: (newName: string) => void;
  onDelete: () => void;
}
```

#### 3-2. WeeklyTargetGrid（週間目標グリッド）
**ファイル**: `packages/frontend/src/components/goals/WeeklyTargetGrid.tsx`

- Step3の右側グリッド部分を担当
- グリッドのレンダリングとインタラクション管理

#### 3-3. TaskBlock（タスクブロック）
**ファイル**: `packages/frontend/src/components/goals/TaskBlock.tsx`

- グリッド内に配置されるタスクのブロック
- 高さがユニット数に連動
- リサイズ可能（0.5unit単位）

---

### Phase 4: テスト実装

#### 4-1. ページレベルのIntegrationテスト
**ファイル**: `packages/frontend/src/pages/GoalSettingPage.test.tsx`

```typescript
import { render, screen } from "@testing-library/react";
import { GoalSettingPage } from "./GoalSettingPage";
// MSWのセットアップ

describe("GoalSettingPage", () => {
  it("renders step 1 initially", async () => {
    render(<GoalSettingPage />);
    expect(await screen.findByText("1ユニットの時間を選んでください")).toBeInTheDocument();
  });

  it("renders step indicator with all steps", async () => {
    render(<GoalSettingPage />);
    expect(await screen.findByText("1. ユニット時間選択")).toBeInTheDocument();
    expect(screen.getByText("2. タスク選択")).toBeInTheDocument();
    expect(screen.getByText("3. 曜日別目標設定")).toBeInTheDocument();
    expect(screen.getByText("4. 確認")).toBeInTheDocument();
  });
});
```

---

## 実装順序（タスクリスト）

### フェーズ1: 基盤整備
- [ ] 1-1. React Routerの設定確認・追加（`/goals`ルート）
- [ ] 1-2. MSWハンドラー作成（`goals.ts`）
- [ ] 1-3. handlers/index.tsへの統合

### フェーズ2: 基本コンポーネント
- [ ] 2-1. GoalSettingPage作成（空のページ）
- [ ] 2-2. StepIndicatorコンポーネント作成
- [ ] 2-3. GoalWizardコンテナ作成（状態管理）

### フェーズ3: 各ステップ実装
- [ ] 3-1. Step1UnitDurationコンポーネント
- [ ] 3-2. Step2TaskSelectionコンポーネント
- [ ] 3-3. TaskItemコンポーネント
- [ ] 3-4. Step3WeeklyTargetsコンポーネント（簡易版: テーブル+SpinButton）
- [ ] 3-5. Step4Confirmationコンポーネント

### フェーズ4: 統合とAPI連携
- [ ] 4-1. ステップ間のナビゲーション実装
- [ ] 4-2. 保存処理の実装（PUT /api/weeks/current/goals）
- [ ] 4-3. キャンセル処理（ダッシュボードへ戻る）

### フェーズ5: テスト
- [ ] 5-1. GoalSettingPageのIntegrationテスト作成

### フェーズ6: 改善（オプション）
- [ ] 6-1. Step3のドラッグ&ドロップ実装
- [ ] 6-2. レスポンシブ対応

---

## 画像アセット一覧

| ファイル | 用途 | サイズ |
|---------|------|--------|
| `step1-illust.png` | Step1のイラスト | - |
| `step1-option-1.png` | 10分オプションアイコン | 58x57px |
| `step1-option-2.png` | 30分オプションアイコン | 43x57px |
| `step1-option-3.png` | 1時間オプションアイコン | 58x57px |
| `step1-option-4.png` | 2時間オプションアイコン | 63x54px |
| `step-2-illust.png` | Step2のイラスト | - |
| `task-icon.png` | タスクアイコン（Step3用） | テキスト高さに合わせる |

---

## 技術的な注意点

### 1. ドラッグ&ドロップ（Step3）
Step3の曜日別目標設定は複雑なインタラクションが必要:
- **推奨ライブラリ**: `@dnd-kit/core`（React 19対応、軽量）
- **代替案**: 簡易実装としてテーブル+数値入力で実装し、後からD&Dを追加

### 2. 状態管理
- ウィザード内の状態はGoalWizardコンポーネントでローカル管理
- 複雑になる場合はuseReducerを検討

### 3. フォームバリデーション
- Step1: ユニット時間が選択されているか
- Step2: 少なくとも1つのタスクが選択されているか
- Step3: 目標が設定されているか（オプション）

### 4. エラーハンドリング
- API呼び出し失敗時のトースト表示
- 保存処理中のローディング状態表示

---

## 参考ファイル

- デザイン画像: `docs/work-logs/20260112-goal-setting-impl/images/`
- 画面定義: `docs/screens.md`（SCR-03）
- コンポーネント定義: `docs/components.md`
- API定義: `packages/backend/openapi.json`
- 既存実装参考: `packages/frontend/src/pages/DashboardPage.tsx`
- MSWハンドラー参考: `packages/frontend/src/mocks/handlers/dashboard.ts`
