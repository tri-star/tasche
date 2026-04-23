import * as oauth from "oauth4webapi"

/**
 * PKCE の code_verifier / code_challenge ペアを生成する
 */
export async function createPkcePair(): Promise<{
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: "S256"
}> {
  const codeVerifier = oauth.generateRandomCodeVerifier()
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" as const }
}

/**
 * CSRF 対策用のランダムな state 値を生成する
 */
export function createState(): string {
  return oauth.generateRandomState()
}
