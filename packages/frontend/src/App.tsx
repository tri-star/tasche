import { RouterProvider } from "react-router-dom"
import { useBootstrapAuth } from "@/auth/useBootstrapAuth"
import { router } from "@/router"

function AppInner() {
  // 起動時に /api/users/me を1回叩いてセッションの有無でログイン状態を復元する
  useBootstrapAuth()
  return <RouterProvider router={router} />
}

export default AppInner
