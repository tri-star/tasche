---
name: テスト環境と注意点
description: react-router v7 + MSW + vitest でのテスト実装時の落とし穴と解決策（Radix UI Select の jsdom 問題含む）
type: feedback
---

## react-router v7 + MSW でのテスト問題

### ProtectedRoute のリダイレクトテスト
`createMemoryRouter` + `RouterProvider` を使うと、Navigate コンポーネントが内部で fetch を呼び出し、
MSW の AbortSignal インターセプターと衝突して unhandled rejection が発生する。

**解決策**: `MemoryRouter` + `Routes` + `Route` を使う（より低レベルなAPIで AbortSignal 問題が起きない）

```tsx
// NG: createMemoryRouter + RouterProvider でリダイレクトテスト
// OK:
render(
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>保護コンテンツ</div>} />
      </Route>
      <Route path="/login" element={<div>ログインページ</div>} />
    </Routes>
  </MemoryRouter>
)
```

### vitest の環境切り替え
oauth4webapi の `calculatePKCECodeChallenge` は jsdom 環境で `input.subarray is not a function` エラーが出る。
`// @vitest-environment node` をファイル先頭に記述して node 環境に切り替えること。

### pnpm test run の挙動
`pnpm --filter frontend test run` は `vitest run --passWithNoTests run` になり、
vitest が "run" をフィルターとして解釈してテストが0件になる。
正しくは `pnpm --filter frontend test` を使う。

### vi.mock でのモック関数の差し替え
モジュールのモック関数をテスト間で差し替える場合、`vi.mocked(fn).mockReturnValue(...)` ではなく、
モック定義の外で変数として保持した関数をテスト内で直接モックする。

```ts
// NG: vi.mocked(useAuth).mockReturnValue(...) ← モジュールモックでは動かない場合がある
// OK:
const mockStartGoogleLogin = vi.fn()
vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ startGoogleLogin: mockStartGoogleLogin, ... }),
}))
// テスト内で: mockStartGoogleLogin.mockResolvedValue(undefined)
```

**Why**: vi.mock のファクトリ関数はホイストされるため、外部変数への参照が正しく動作する形にする必要がある。
**How to apply**: useAuth など複数テストで動作を変えたいモックには、外部変数パターンを使う。

### Radix UI コンポーネントの jsdom 問題

Radix UI Select/Dropdown 等のコンポーネントは jsdom 環境で以下の DOM API が未実装のためエラーが出る:
- `hasPointerCapture` / `releasePointerCapture` / `setPointerCapture`
- `scrollIntoView`

**解決策**: `src/test/setup.ts` にグローバル stub を追加する（node 環境ではガードが必要）。

```ts
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(window.HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
}
```

**Why**: pkce.test.ts は `// @vitest-environment node` を使うため `window` が存在しない。
**How to apply**: node 環境で使うテストがある場合は必ず `typeof window !== "undefined"` でガードする。
