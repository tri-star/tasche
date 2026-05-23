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
