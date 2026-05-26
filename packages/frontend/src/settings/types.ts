export type Theme = "light" | "dark"

export type Settings = {
  timezone: string
  theme: Theme
}

export const DEFAULT_SETTINGS: Settings = { timezone: "Asia/Tokyo", theme: "light" }
