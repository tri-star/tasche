import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/modules/auth/RequireAuth'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { LoginPage } from '@/pages/LoginPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TasksPage } from '@/pages/TasksPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
