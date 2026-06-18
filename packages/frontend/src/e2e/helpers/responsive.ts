import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

/**
 * ドキュメント全体が横にはみ出していないことを確認する
 */
export async function expectNoDocumentHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentOverflow =
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    const bodyOverflow = document.body.scrollWidth - document.body.clientWidth

    const offenders = [...document.querySelectorAll<HTMLElement>("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          ariaLabel: element.getAttribute("aria-label") ?? "",
          className: element.className,
          text: (element.textContent ?? "").trim().slice(0, 40),
          rightOverflow: Math.round((rect.right - window.innerWidth) * 10) / 10,
          scrollOverflow: element.scrollWidth - element.clientWidth,
        }
      })
      .filter((element) => element.rightOverflow > 1 || element.scrollOverflow > 1)
      .sort(
        (a, b) =>
          Math.max(b.rightOverflow, b.scrollOverflow) - Math.max(a.rightOverflow, a.scrollOverflow),
      )
      .slice(0, 5)

    return {
      documentOverflow,
      bodyOverflow,
      offenders,
    }
  })

  if (overflow.documentOverflow > 1 || overflow.bodyOverflow > 1) {
    throw new Error(
      `Horizontal overflow detected: document=${overflow.documentOverflow}, body=${overflow.bodyOverflow}, offenders=${JSON.stringify(overflow.offenders)}`,
    )
  }

  expect(overflow.documentOverflow).toBeLessThanOrEqual(1)
  expect(overflow.bodyOverflow).toBeLessThanOrEqual(1)
}
