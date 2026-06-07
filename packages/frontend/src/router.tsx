import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import { ProtectedRoute } from "@/components/routing/ProtectedRoute"
import { AccountPage } from "@/pages/AccountPage"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { GoalSettingPage } from "@/pages/GoalSettingPage"
import { LoginPage } from "@/pages/LoginPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { TasksPage } from "@/pages/TasksPage"

const DesignTokensPage = import.meta.env.DEV
  ? lazy(() =>
      import("@/pages/dev/DesignTokensPage").then((m) => ({
        default: m.DesignTokensPage,
      })),
    )
  : null

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  ...(import.meta.env.DEV && DesignTokensPage
    ? [
        {
          path: "/_dev/design/tokens",
          element: (
            <Suspense fallback={null}>
              <DesignTokensPage />
            </Suspense>
          ),
        },
      ]
    : []),
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
