import * as Sentry from "@sentry/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getDefaultStore, Provider as JotaiProvider } from "jotai"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { authStatusAtom, currentUserAtom } from "./auth/atoms"
import { createAuthClient } from "./auth/authClient"
import { setAuthClient } from "./auth/authClientSingleton"
import { AppErrorFallback } from "./components/common/AppErrorFallback"
import { initSentry } from "./lib/sentry"
import { ThemeProvider } from "./theme/ThemeProvider"
import "./index.css"

// Sentryは可能な限り早期に初期化する（DSN未設定時はno-op）
initSentry()

// orval mutator 用の AuthClient シングルトンを登録
// Jotai のストアを直接参照するために getDefaultStore を使用
const jotaiStore = getDefaultStore()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5分
    },
  },
})

const authClient = createAuthClient({
  baseUrl: "",
  onUnauthorized: () => {
    queryClient.clear()
    jotaiStore.set(currentUserAtom, null)
    jotaiStore.set(authStatusAtom, "anonymous")
  },
})

setAuthClient(authClient)

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
      <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
        <JotaiProvider store={jotaiStore}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </QueryClientProvider>
        </JotaiProvider>
      </Sentry.ErrorBoundary>
    </StrictMode>,
  )
})
