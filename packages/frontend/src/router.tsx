import { createBrowserRouter } from "react-router-dom"
import { ProtectedRoute } from "@/components/routing/ProtectedRoute"
import { AccountPage } from "@/pages/AccountPage"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { DesignTokensPage } from "@/pages/dev/DesignTokensPage"
import { GoalSettingPage } from "@/pages/GoalSettingPage"
import { LoginPage } from "@/pages/LoginPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { TasksPage } from "@/pages/TasksPage"

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  ...(import.meta.env.DEV ? [{ path: "/_dev/design/tokens", element: <DesignTokensPage /> }] : []),
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/goals", element: <GoalSettingPage /> },
      { path: "/account", element: <AccountPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
])
