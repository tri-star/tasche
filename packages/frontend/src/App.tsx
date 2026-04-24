import { RouterProvider } from "react-router-dom"
import { useBootstrapAuth } from "@/auth/useBootstrapAuth"
import { router } from "@/router"

function AppInner() {
  // 起動時に /api/auth/refresh を1回試みてログイン状態を復元する
  useBootstrapAuth()
  return <RouterProvider router={router} />
}

export default AppInner
