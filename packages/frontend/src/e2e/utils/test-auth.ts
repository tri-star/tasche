export type TestAuthUser = {
  email?: string
  userId?: string
}

type TestAuthResponse = {
  access_token?: string
}

const apiBaseURL = process.env.E2E_API_BASE_URL || "http://localhost:8000"

const buildTestAuthUrl = (user?: TestAuthUser) => {
  const url = new URL("/api/test-auth", apiBaseURL)
  const params = new URLSearchParams()

  if (user?.email) {
    params.set("email", user.email)
  } else if (user?.userId) {
    params.set("user_id", user.userId)
  }

  const query = params.toString()
  if (query) {
    url.search = query
  }

  return url.toString()
}

export const getTestAuthToken = async (user?: TestAuthUser) => {
  const response = await fetch(buildTestAuthUrl(user), {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(`Failed to get test auth token: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as TestAuthResponse

  if (!data.access_token) {
    throw new Error("Test auth response missing access_token")
  }

  return data.access_token
}
