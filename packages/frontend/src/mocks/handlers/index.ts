import type { RequestHandler } from "msw";

import { getOrvalHandlers } from "./generated";
import { passthroughHandlers } from "./passthrough";

export const handlers: RequestHandler[] = [...passthroughHandlers, ...getOrvalHandlers()];
