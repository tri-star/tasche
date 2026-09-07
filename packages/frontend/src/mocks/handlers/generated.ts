import type { RequestHandler } from "msw"

// orval 8.28.x から MSW モックの生成先が client.ts から client.msw.ts に分離された
import * as generatedClient from "@/api/generated/client.msw"

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
