// @vitest-environment node
import { calculatePKCECodeChallenge } from "oauth4webapi"
import { describe, expect, it } from "vitest"
import { createPkcePair, createState } from "./pkce"

describe("createPkcePair", () => {
  it("codeVerifier が 43〜128 文字であること", async () => {
    const { codeVerifier } = await createPkcePair()
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(codeVerifier.length).toBeLessThanOrEqual(128)
  })

  it("codeVerifier が URL-safe 文字のみで構成されること", async () => {
    const { codeVerifier } = await createPkcePair()
    // URL-safe base64: A-Z, a-z, 0-9, -, _
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it("codeChallenge が同じ codeVerifier から決定論的に生成されること", async () => {
    const { codeVerifier, codeChallenge } = await createPkcePair()
    const expected = await calculatePKCECodeChallenge(codeVerifier)
    expect(codeChallenge).toBe(expected)
  })

  it("codeChallengeMethod が S256 であること", async () => {
    const { codeChallengeMethod } = await createPkcePair()
    expect(codeChallengeMethod).toBe("S256")
  })

  it("呼び出しごとに異なる codeVerifier が生成されること", async () => {
    const pair1 = await createPkcePair()
    const pair2 = await createPkcePair()
    expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier)
  })
})

describe("createState", () => {
  it("呼び出しごとに異なる state が生成されること", () => {
    const state1 = createState()
    const state2 = createState()
    expect(state1).not.toBe(state2)
  })

  it("state が空でない文字列であること", () => {
    const state = createState()
    expect(typeof state).toBe("string")
    expect(state.length).toBeGreaterThan(0)
  })
})
