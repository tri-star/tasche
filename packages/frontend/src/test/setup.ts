import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll } from "vitest"

import { resetMockAuthUser } from "@/mocks/handlers/authSession"
import { server } from "@/mocks/server"

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
