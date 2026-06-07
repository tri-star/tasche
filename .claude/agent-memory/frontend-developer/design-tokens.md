---
name: デザイントークン規約
description: Tasche フロントエンドのテーマトークン構造・ダークモード対応の規約（TCH-16で確立）
metadata:
  type: project
---

## テーマ構造

- `darkMode: ["class"]` — `<html>` に `dark` クラス付与でダーク切替
- CSS変数は `packages/frontend/src/index.css` の `:root` / `.dark` に定義
- Tailwindクラスは `packages/frontend/tailwind.config.ts` の `theme.extend.colors` で定義

## トークンカテゴリ

- **ベース**: `bg-background`, `text-foreground`
- **コンポーネント**: `bg-card`, `bg-muted`, `bg-accent`, `bg-popover`
- **インタラクション**: `bg-primary`, `border-border`, `border-ring`（フォーカスに使う）
- **状態色（TCH-16追加）**: `success`, `success-soft`, `warning`, `warning-soft`, `info`, `destructive-soft` とそれぞれの `foreground`

## 置換ルール（ハードコード→トークン）

| 旧クラス | 新クラス |
|---------|---------|
| `bg-white`, `bg-white/80` | `bg-card` |
| `text-emerald-950`, `text-emerald-900` | `text-foreground` |
| `text-emerald-700`, `text-emerald-800` | `text-foreground` or `text-muted-foreground` |
| `border-emerald-100`, `border-emerald-200` | `border-border` |
| `bg-emerald-50`, `bg-emerald-100` | `bg-accent` |
| `text-emerald-600` (アイコン) | `text-primary` |
| `bg-gray-100`, `hover:bg-gray-200` | `bg-muted`, `hover:bg-muted/80` |
| `bg-rose-50 text-rose-700` (エラーバナー) | `bg-destructive-soft text-destructive-soft-foreground` |
| `border-rose-200`, `bg-rose-50` (エラー枠) | `border-destructive/40 bg-destructive-soft` |
| `bg-amber-50 text-amber-800` (警告バナー) | `bg-warning-soft text-warning-soft-foreground` |
| `focus:border-emerald-400 focus:ring-emerald-100` | `focus:border-ring focus:ring-ring/30` |

## ヒートマップの例外対応

段階的色分け（WeeklyMatrix等）はセマンティック化せず `dark:` バリアント併記:
```tsx
"bg-red-200 dark:bg-red-900/50"
"bg-green-200 dark:bg-green-900/50"
```

## 画像・イラストのダーク対応

- 第一候補: `dark:opacity-80` (減光)
- 浮きが強い場合: `dark:opacity-60` や `dark:hidden`

## 開発用確認ページ

`/_dev/design/tokens` — 開発環境のみアクセス可能、ライト/ダーク切替ボタン付き

## 詳細ドキュメント

`docs/design-tokens.md` にトークン一覧表・用途ガイド・アンチパターン集あり
