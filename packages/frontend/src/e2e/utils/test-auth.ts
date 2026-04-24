import { getApiBaseUrl } from "./api-base-url"

export const E2E_STUB_USER_EMAIL = "e2e-test@example.com"

type StubLoginResponse = {
  data: {
    access_token: string
  }
}

export const getTestAuthToken = async (email = E2E_STUB_USER_EMAIL) => {
  const response = await fetch(new URL("/api/auth/stub-login", getApiBaseUrl()).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get test auth token: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as StubLoginResponse

  if (!data.data?.access_token) {
    throw new Error("Stub login response missing access_token")
  }

  return data.data.access_token
}
