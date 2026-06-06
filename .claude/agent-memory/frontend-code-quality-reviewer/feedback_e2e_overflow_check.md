---
name: e2e-overflow-check-pattern
description: overflow-x-auto コンテナの内部オーバーフローは getBoundingClientRect では検出できない。TCH-65で発見。
metadata:
  type: feedback
---

`overflow-x-auto` で囲んだコンテナに対して `el.getBoundingClientRect().right <= window.innerWidth` を評価しても、コンテナ自体が viewport 内に収まった幅を返すため、内部テーブルがオーバーフローしていても `true` になる（誤検知）。

**Why:** `getBoundingClientRect()` はスクロールコンテナのレイアウト上の位置を返し、内部コンテンツのはみ出しは反映しない。

**How to apply:** 横スクロール対応コンテナの「内部オーバーフロー」をテストするには `el.scrollWidth <= el.clientWidth + 1` を使う。ドキュメント全体のはみ出しには `document.documentElement.scrollWidth - clientWidth` を使う（両者を使い分ける）。

```ts
// 内部オーバーフローチェック
const noInternalOverflow = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="..."]')
  return el.scrollWidth <= el.clientWidth + 1
})
expect(noInternalOverflow).toBe(true)
```
