import type { RequestHandler } from "msw"

import { goalsHandlers } from "./goals"
import { passthroughHandlers } from "./passthrough"

export const handlers: RequestHandler[] = [...goalsHandlers, ...passthroughHandlers]
