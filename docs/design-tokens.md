# デザイントークン一覧

Tasche フロントエンドで使用するデザイントークンの一覧と用途ガイドです。
Tailwind CSS の `class` ダークモード戦略（`darkMode: ["class"]`）を使用し、
`<html>` 要素に `dark` クラスが付与されると `.dark { }` ブロックのCSS変数が適用されます。

## 視覚確認ページ

開発環境では `/_dev/design/tokens` でトークンの見た目を確認できます（本番環境では表示されません）。

---

## トークン一覧表

### ベース色

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--background` | `bg-background` / `text-background` | `0 0% 96%` (#F5F5F5) | `220 20% 10%` | ページ全体の背景 |
| `--foreground` | `text-foreground` | `0 0% 20%` | `0 0% 95%` | 主要な本文テキスト・見出し |

### コンポーネント色

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--card` | `bg-card` | `0 0% 100%` (白) | `220 20% 14%` | カード・パネル・ダイアログ背景 |
| `--card-foreground` | `text-card-foreground` | `0 0% 20%` | `0 0% 95%` | カード内テキスト |
| `--popover` | `bg-popover` | `0 0% 100%` | `220 20% 14%` | ドロップダウン・ポップオーバー背景 |
| `--popover-foreground` | `text-popover-foreground` | `0 0% 20%` | `0 0% 95%` | ポップオーバー内テキスト |
| `--muted` | `bg-muted` | `0 0% 90%` | `220 20% 20%` | 中立的な背景（非強調エリア） |
| `--muted-foreground` | `text-muted-foreground` | `0 0% 45%` | `0 0% 60%` | 補助テキスト・プレースホルダー |
| `--accent` | `bg-accent` | `122 73% 93%` (薄緑) | `122 30% 20%` | 薄い強調背景（選択状態など） |
| `--accent-foreground` | `text-accent-foreground` | `122 39% 30%` | `122 39% 80%` | アクセント背景上のテキスト |
| `--secondary` | `bg-secondary` | `0 0% 96%` | `220 20% 20%` | セカンダリボタン・補助背景 |
| `--secondary-foreground` | `text-secondary-foreground` | `0 0% 20%` | `0 0% 95%` | セカンダリ背景上のテキスト |

### インタラクション色

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--primary` | `bg-primary` / `text-primary` | `122 39% 49%` (#4CAF50) | `122 39% 55%` | メインアクション・アクセントカラー |
| `--primary-foreground` | `text-primary-foreground` | `0 0% 100%` | `0 0% 100%` | プライマリ背景上のテキスト（白） |
| `--border` | `border-border` | `0 0% 85%` | `220 20% 20%` | 通常の境界線 |
| `--input` | `border-input` | `0 0% 85%` | `220 20% 20%` | フォーム入力の境界線 |
| `--ring` | `ring-ring` / `border-ring` / `focus:border-ring` | `122 39% 49%` | `122 39% 55%` | フォーカスリング・選択状態の強調 |

### 状態色（エラー）

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--destructive` | `bg-destructive` / `text-destructive` / `border-destructive` | `0 84% 60%` | `0 62% 40%` | エラー・削除アクション |
| `--destructive-foreground` | `text-destructive-foreground` | `0 0% 100%` | `0 0% 100%` | destructive背景上のテキスト |
| `--destructive-soft` | `bg-destructive-soft` | `0 86% 97%` (薄赤) | `0 40% 22%` | エラーバナー・警告背景 |
| `--destructive-soft-foreground` | `text-destructive-soft-foreground` | `0 74% 42%` | `0 80% 85%` | soft背景上のエラーテキスト |

### 状態色（成功）

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--success` | `bg-success` / `text-success` / `border-success` | `122 39% 49%` | `122 39% 55%` | 達成・充足状態 |
| `--success-foreground` | `text-success-foreground` | `0 0% 100%` | `0 0% 100%` | success背景上のテキスト |
| `--success-soft` | `bg-success-soft` | `122 73% 93%` (薄緑) | `122 30% 20%` | 達成バッジ・充足ハイライト背景 |
| `--success-soft-foreground` | `text-success-soft-foreground` | `122 39% 30%` | `122 39% 80%` | soft背景上の成功テキスト |

### 状態色（警告）

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--warning` | `bg-warning` / `text-warning` / `border-warning` | `38 92% 50%` (amber) | `38 80% 55%` | 注意・進行中の状態 |
| `--warning-foreground` | `text-warning-foreground` | `0 0% 20%` | `0 0% 10%` | warning背景上のテキスト |
| `--warning-soft` | `bg-warning-soft` | `48 96% 89%` (薄amber) | `38 40% 22%` | 警告バナー・プログレス背景 |
| `--warning-soft-foreground` | `text-warning-soft-foreground` | `38 80% 30%` | `38 90% 80%` | soft背景上の警告テキスト |

### 状態色（情報）

| CSS変数 | Tailwindクラス | ライト値 (HSL) | ダーク値 (HSL) | 用途 |
|---------|---------------|----------------|----------------|------|
| `--info` | `bg-info` / `text-info` / `border-info` | `199 89% 48%` (sky) | `199 80% 60%` | 情報表示・不足状態 |
| `--info-foreground` | `text-info-foreground` | `0 0% 100%` | `0 0% 10%` | info背景上のテキスト |

---

## 使い方ガイド

### どのトークンを使うべきか

#### 背景色

- **ページ全体の背景**: `bg-background`
- **カード・パネル・モーダルの背景**: `bg-card`（`bg-white` は使わない）
- **中立的な薄い背景（ホバー・サブエリア）**: `bg-muted` または `bg-muted/40`
- **薄い緑の強調背景**: `bg-accent` または `bg-accent/40`
- **フォーム入力の背景**: `bg-card` または `bg-background`

#### テキスト色

- **主要な見出し・本文**: `text-foreground`（`text-emerald-900/950` は使わない）
- **補助テキスト・ラベル**: `text-muted-foreground`
- **アクセントアイコン・バッジ**: `text-primary`

#### 境界線色

- **通常の枠線**: `border-border`（`border-emerald-100/200` は使わない）
- **フォーカス強調**: `focus:border-ring`（`focus:border-emerald-300` は使わない）
- **選択・アクティブ状態**: `border-primary` または `border-ring`

#### 状態色の選び方

| 状態 | 背景 | テキスト | 枠線 |
|------|------|---------|------|
| エラー（強） | `bg-destructive` | `text-destructive-foreground` | `border-destructive` |
| エラー（弱・バナー） | `bg-destructive-soft` | `text-destructive-soft-foreground` | `border-destructive/40` |
| 成功（強） | `bg-success` | `text-success-foreground` | `border-success` |
| 成功（弱・バッジ） | `bg-success-soft` | `text-success-soft-foreground` | `border-success` |
| 警告（強） | `bg-warning` | `text-warning-foreground` | `border-warning` |
| 警告（弱・バナー） | `bg-warning-soft` | `text-warning-soft-foreground` | `border-warning/40` |
| 情報 | `bg-info` | `text-info-foreground` | `border-info` |
| 情報テキストのみ | — | `text-info` | — |

---

## アンチパターン集

### やってはいけない例と代替トークン

```tsx
// NG: ハードコードされた固定色
<div className="bg-white">...</div>
// OK:
<div className="bg-card">...</div>

// NG: emerald固定色で文字
<h1 className="text-emerald-900">...</h1>
// OK:
<h1 className="text-foreground">...</h1>

// NG: emerald固定色で境界線
<div className="border-emerald-100">...</div>
// OK:
<div className="border-border">...</div>

// NG: rose固定色でエラー表示
<div className="bg-rose-50 text-rose-700">エラー</div>
// OK:
<div className="bg-destructive-soft text-destructive-soft-foreground">エラー</div>

// NG: emerald固定色で成功バッジ
<span className="bg-emerald-100 text-emerald-700">成功</span>
// OK:
<span className="bg-success-soft text-success-soft-foreground">成功</span>

// NG: amber固定色で警告バナー
<div className="bg-amber-50 text-amber-800 border-amber-200">警告</div>
// OK:
<div className="bg-warning-soft text-warning-soft-foreground border-warning/40">警告</div>

// NG: フォーカスリングにemerald固定色
<input className="focus:border-emerald-400 focus:ring-emerald-100" />
// OK:
<input className="focus:border-ring focus:ring-ring/30" />

// NG: gray固定色でmuted背景
<div className="bg-gray-100 hover:bg-gray-200">...</div>
// OK:
<div className="bg-muted hover:bg-muted/80">...</div>
```

### ヒートマップなど段階表示

完了率ヒートマップのように「段階を色で識別する」UIは、セマンティックトークンで表現します:

```tsx
// OK: ヒートマップの段階色（セマンティックトークン使用）
if (rate < 50) return "bg-destructive-soft"
if (rate < 100) return "bg-warning-soft"
return "bg-success-soft"
```

### 画像・イラストのダーク対応

ライト前提の画像・イラストはダーク時に浮いて見えるため、減光を適用します:

```tsx
// 減光（第一候補）
<img className="dark:opacity-80" />

// 背景が明るすぎる場合はさらに減光
<img className="opacity-80 dark:opacity-60" />
```

---

## tasche固定トークンについて

`tailwind.config.ts` の `tasche.*` トークンは**ブランドカラーとしてログイン画面専用**に残してあります。
アプリ本体（ダッシュボード・タスク・設定・目標設定）では使用しないでください。

| トークン | 用途 | 備考 |
|---------|------|------|
| `tasche-green` | ロゴ・ブランドカラー | 維持（固定色でよい） |
| `tasche-ivory` | ログイン画面の背景 | ログイン専用 |
| `tasche-text` | → `text-foreground` に置換 | 設定・アカウント・コールバック・ProtectedRoute に残存していたが TCH-16 で修正済み |
| `tasche-textSub` | → `text-muted-foreground` に置換 | 設定・アカウント・コールバック・ProtectedRoute に残存していたが TCH-16 で修正済み |
| `tasche-textMuted` | → `text-muted-foreground` に置換 | TCH-16 時点でアプリ本体への残存なし |
| `tasche-greenSoft` | アバター背景（AccountPage） | → `bg-accent text-accent-foreground` に置換済み（TCH-16）|
