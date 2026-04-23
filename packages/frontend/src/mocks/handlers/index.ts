import type { RequestHandler } from "msw"

import { authHandlers } from "./auth"
import { dashboardHandlers } from "./dashboard"
import { getOrvalHandlers } from "./generated"
import { goalsHandlers } from "./goals"
import { passthroughHandlers } from "./passthrough"
import { usersHandlers } from "./users"

// authHandlers を先頭に置くことで、orval の古い生成ハンドラより優先させる
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...usersHandlers,
  ...dashboardHandlers,
  ...goalsHandlers,
  ...passthroughHandlers,
  ...getOrvalHandlers(),
]
