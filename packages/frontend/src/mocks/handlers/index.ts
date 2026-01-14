import type { RequestHandler } from "msw"

import { dashboardHandlers } from "./dashboard"
import { getOrvalHandlers } from "./generated"
import { goalsHandlers } from "./goals"
import { passthroughHandlers } from "./passthrough"

export const handlers: RequestHandler[] = [
  ...dashboardHandlers,
  ...goalsHandlers,
  ...passthroughHandlers,
  ...getOrvalHandlers(),
]
