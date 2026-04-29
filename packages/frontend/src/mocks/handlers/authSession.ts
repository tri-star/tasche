export type MockAuthUser = {
  email: string
  name: string
}

export const MOCK_AUTH_USER_STORAGE_KEY = "tasche.msw.auth.user"

let currentUser: MockAuthUser | null = null

function getStorage(): Storage | null {
  if (typeof sessionStorage === "undefined") {
    return null
  }

  return sessionStorage
}

function parseMockAuthUser(value: unknown): MockAuthUser | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const user = value as Record<string, unknown>
  if (typeof user.email === "string" && typeof user.name === "string") {
    return {
      email: user.email,
      name: user.name,
    }
  }

  return null
}

function readStoredUser(): MockAuthUser | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const storedValue = storage.getItem(MOCK_AUTH_USER_STORAGE_KEY)
  if (!storedValue) {
    return null
  }

  try {
    const user = parseMockAuthUser(JSON.parse(storedValue))
    if (user) {
      return user
    }
  } catch {
    // 壊れた mock セッションは破棄して未認証として扱う
  }

  storage.removeItem(MOCK_AUTH_USER_STORAGE_KEY)
  return null
}

export function getMockAuthUser(): MockAuthUser | null {
  if (currentUser) {
    return currentUser
  }

  currentUser = readStoredUser()
  return currentUser
}

export function setMockAuthUser(user: MockAuthUser | null): void {
  const storage = getStorage()

  currentUser = user
  if (!storage) {
    return
  }

  if (user) {
    storage.setItem(MOCK_AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    storage.removeItem(MOCK_AUTH_USER_STORAGE_KEY)
  }
}

export function resetMockAuthUser(): void {
  setMockAuthUser(null)
}
