import type { RequestHandler } from "msw"

import { authHandlers } from "./auth"
import { getOrvalHandlers } from "./generated"
import { goalsHandlers } from "./goals"
import { passthroughHandlers } from "./passthrough"
import { settingsHandlers } from "./settings"
import { usersHandlers } from "./users"

// 手書きハンドラを先に登録することで orval 自動生成モックより優先させる
export const handlers: RequestHandler[] = [
  ...passthroughHandlers,
  ...authHandlers,
  ...usersHandlers,
  ...settingsHandlers,
  ...goalsHandlers,
  // orval 自動生成モックは最後（手書きハンドラが優先解決される）
  ...getOrvalHandlers(),
]
