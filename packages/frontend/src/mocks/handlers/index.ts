import type { RequestHandler } from "msw"

import { passthroughHandlers } from "./passthrough"

export const handlers: RequestHandler[] = [...passthroughHandlers]
