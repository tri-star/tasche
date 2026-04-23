import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearPendingOAuth, readPendingOAuth, savePendingOAuth } from "./storage"

describe("storage", () => {
  beforeEach(() => {
    // sessionStorage をクリア
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  describe("savePendingOAuth / readPendingOAuth", () => {
    it("保存したオブジェクトを読み出せること", () => {
      const pending = {
        state: "test-state",
        codeVerifier: "test-verifier",
        redirectUri: "http://localhost:5173/auth/callback",
        createdAt: Date.now(),
      }

      savePendingOAuth(pending)
      const result = readPendingOAuth()

      expect(result).toEqual(pending)
    })

    it("何も保存していない場合は null を返すこと", () => {
      const result = readPendingOAuth()
      expect(result).toBeNull()
    })

    it("10分以上経過した場合は自動破棄して null を返すこと", () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000 - 1
      const pending = {
        state: "test-state",
        codeVerifier: "test-verifier",
        redirectUri: "http://localhost:5173/auth/callback",
        createdAt: tenMinutesAgo,
      }

      savePendingOAuth(pending)
      const result = readPendingOAuth()

      expect(result).toBeNull()
      // sessionStorage からも削除されていること
      expect(sessionStorage.getItem("tasche.oauth.pending")).toBeNull()
    })

    it("不正な JSON が保存されている場合は null を返すこと", () => {
      sessionStorage.setItem("tasche.oauth.pending", "invalid json")
      const result = readPendingOAuth()
      expect(result).toBeNull()
    })
  })

  describe("clearPendingOAuth", () => {
    it("保存したデータを削除すること", () => {
      savePendingOAuth({
        state: "test-state",
        codeVerifier: "test-verifier",
        redirectUri: "http://localhost:5173/auth/callback",
        createdAt: Date.now(),
      })

      clearPendingOAuth()
      const result = readPendingOAuth()

      expect(result).toBeNull()
    })
  })
})
