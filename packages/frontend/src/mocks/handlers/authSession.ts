export type MockAuthUser = {
  email: string
  name: string
}

let currentUser: MockAuthUser | null = null

export function getMockAuthUser(): MockAuthUser | null {
  return currentUser
}

export function setMockAuthUser(user: MockAuthUser | null): void {
  currentUser = user
}

export function resetMockAuthUser(): void {
  currentUser = null
}
