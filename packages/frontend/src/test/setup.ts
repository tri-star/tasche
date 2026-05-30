import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll } from "vitest"

import { resetMockAuthUser } from "@/mocks/handlers/authSession"
import { server } from "@/mocks/server"

// Radix UI コンポーネントが jsdom 環境で必要とする DOM API の stub
// node 環境（pkce.test.ts など）では window が存在しないためガードする
if (typeof window !== "undefined") {
  // scrollIntoView は jsdom 未実装のため no-op で登録する
  window.HTMLElement.prototype.scrollIntoView = () => {}
  // hasPointerCapture は Radix UI Select が使用するが jsdom では未実装
  Object.assign(window.HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })

  // cmdk（Command コンポーネント）が使用する ResizeObserver の stub
  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  if (typeof window.HTMLDialogElement !== "undefined") {
    if (typeof window.HTMLDialogElement.prototype.showModal !== "function") {
      window.HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute("open", "")
      }
    }

    if (typeof window.HTMLDialogElement.prototype.close !== "function") {
      window.HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute("open")
        this.dispatchEvent(new Event("close"))
      }
    }
  }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  resetMockAuthUser()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
