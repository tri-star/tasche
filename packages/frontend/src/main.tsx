import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  if (import.meta.env.VITE_USE_MSW !== "true") {
    return
  }

  const { startWorker } = await import("./mocks/browser")
  await startWorker()
}

enableMocking().then(() => {
  const root = document.getElementById("root")
  if (!root) {
    throw new Error("Root element '#root' not found")
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
