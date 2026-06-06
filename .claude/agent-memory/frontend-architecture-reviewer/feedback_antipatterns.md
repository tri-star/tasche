---
name: tasche-frontend-recurring-antipatterns
description: Tascheフロントエンドレビューで繰り返し発見されるアンチパターン
metadata:
  type: feedback
---

## useState の初期値が非同期設定取得に追従しない問題

`useState(initial)` の `initial` に非同期フェッチ値（`settings?.timezone ?? "Asia/Tokyo"` 等）を使うと、
コンポーネントマウント時点では null の場合があり、フェッチ完了後も draft は更新されない。

**Why:** useBootstrapAuth は async で atom を初期化するため、ProtectedRoute 通過直後は settings が null になる瞬間がある。

**How to apply:** `useEffect` で settings 変化を draft に反映するか、settings が null の間はコンポーネントにガードを設ける。TCH-15 の TimezoneSection で指摘済み。

---

## 楽観更新のフォールバック値ハードコード

楽観更新で `settings === null` の場合に `{ timezone: "Asia/Tokyo", theme: next }` 等をハードコードすると、
settings 取得前に操作されたときに意図しない値でサーバーを上書きするリスクがある。

**Why:** サーバーに保存済みの値と異なるフォールバックを使うと、ユーザーデータを無言で上書きしてしまう。

**How to apply:** `settings/types.ts` に `DEFAULT_SETTINGS` 定数を定義して集約するか、settings が null の場合は操作を disabled にする。TCH-15 の useTheme で指摘済み。

---

## GoalsResponse / PreviousGoalsResponse の union を source 変数で受け取るアンチパターン

`const source = hasCurrent ? goalsData : prev_goals` のように異なる型の union を1変数に代入して
共通プロパティを呼び出すと、TypeScript の narrowing が効かなくなる。

**Why:** 現時点では両型に同名フィールドがあっても、将来の型の変化をコンパイルエラーで検出できなくなる。
また変数が「当週値」なのか「過去週値」なのかが読者に不明確になる。

**How to apply:** `if (hasCurrent) { ... goalsData ... } else if (prev) { ... prev ... }` と2パスで明示的に分岐する。
TCH-9 の GoalWizard で Critical として指摘済み。

---

## E2E ヘルパー関数の複数ファイル間重複

`expectNoDocumentHorizontalOverflow` のようなレスポンシブ検証ヘルパーが、
`DashboardResponsive.e2e.spec.ts`、`AppShellResponsive.e2e.spec.ts`、`GoalSettingResponsive.e2e.spec.ts`
と複数の E2E スペックファイルにコピーされている。`src/e2e/helpers/` ディレクトリは未作成。

**Why:** 共通化されていないため、判定ロジックを変更したい場合に全ファイルを修正する必要がある。
また、ファイルごとに微妙に実装が変わるリスクがある。

**How to apply:** `src/e2e/helpers/responsive.ts` 等に切り出してインポートする。
TCH-65 の GoalSettingResponsive.e2e.spec.ts でも同関数がコピーされ再指摘が必要な状態。

---

## settings フェッチ失敗 + フォールバック値による保存操作

useBootstrapAuth で settings フェッチが失敗すると currentSettingsAtom が null のまま authenticated に遷移する。
フォールバック値（`settings?.timezone ?? "Asia/Tokyo"`）でフォームが初期化された状態で「保存」ボタンが押せると、
DBに保存済みの設定を上書きしてしまう。

**Why:** データ損失リスク。Asia/Tokyo 以外のタイムゾーンを設定しているユーザーが設定画面を開いて保存すると Asia/Tokyo に戻る。

**How to apply:** settings === null のときに保存ボタンを disabled にするか、フォームコンポーネント自体を表示しないガードを設ける。TCH-15 で Critical として指摘済み。
