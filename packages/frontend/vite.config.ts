import { execSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

function mswPlugin(useMsw: boolean): Plugin {
  return {
    name: "vite-plugin-msw",
    configResolved() {
      const workerPath = "public/mockServiceWorker.js"
      if (useMsw) {
        execSync("npx msw init public --save", { stdio: "inherit" })
      } else if (existsSync(workerPath)) {
        rmSync(workerPath)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000"
  const useMsw = env.VITE_USE_MSW === "true"
  const devPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173

  return {
    plugins: [react(), mswPlugin(useMsw)],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: devPort,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
