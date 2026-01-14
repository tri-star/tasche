export function shouldUseMsw() {
  return import.meta.env.DEV && import.meta.env.VITE_USE_MSW === "true"
}

export function getOnUnhandledRequestMode(): "bypass" | "error" | "warn" {
  const raw = import.meta.env.VITE_MSW_UNHANDLED
  if (raw === "bypass" || raw === "warn" || raw === "error") {
    return raw
  }
  return "error"
}
