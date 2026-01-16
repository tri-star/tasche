import type { RequestHandler } from "msw"

import * as generatedClient from "@/api/generated/client"

export function getOrvalHandlers(): RequestHandler[] {
  const handlers: RequestHandler[] = []

  for (const [key, value] of Object.entries(generatedClient)) {
    if (!key.endsWith("MockHandler")) {
      continue
    }

    if (typeof value !== "function") {
      continue
    }

    const handlerFactory = value as (...args: unknown[]) => unknown
    const args = new Array(handlerFactory.length).fill(undefined)
    const handler = handlerFactory(...args)
    if (handler) {
      handlers.push(handler as RequestHandler)
    }
  }

  return handlers
}
