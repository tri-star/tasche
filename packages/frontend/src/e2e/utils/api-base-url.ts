const DEFAULT_API_BASE_URL = "http://localhost:8000"

export const getApiBaseUrl = () =>
  process.env.E2E_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
