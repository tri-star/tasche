import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

/**
 * ドキュメント全体が横にはみ出していないことを確認する
 */
export async function expectNoDocumentHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.documentOverflow).toBeLessThanOrEqual(1)
  expect(overflow.bodyOverflow).toBeLessThanOrEqual(1)
}
