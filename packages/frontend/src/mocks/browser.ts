import { setupWorker } from "msw/browser"
import { getOnUnhandledRequestMode } from "./enabled"
import { handlers } from "./handlers"

export const worker = setupWorker(...handlers)

export async function startWorker() {
  await worker.start({
    onUnhandledRequest: getOnUnhandledRequestMode(),
  })
}
