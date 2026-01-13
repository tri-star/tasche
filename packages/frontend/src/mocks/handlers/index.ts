import type { RequestHandler } from "msw";

import { dashboardHandlers } from "./dashboard";
import { getOrvalHandlers } from "./generated";
import { passthroughHandlers } from "./passthrough";

export const handlers: RequestHandler[] = [
  ...dashboardHandlers,
  ...passthroughHandlers,
  ...getOrvalHandlers(),
];
