import { createBrowserRouter } from "react-router-dom"
import { ProtectedRoute } from "@/components/routing/ProtectedRoute"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { GoalSettingPage } from "@/pages/GoalSettingPage"
import { LoginPage } from "@/pages/LoginPage"

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/goals", element: <GoalSettingPage /> },
    ],
  },
])
