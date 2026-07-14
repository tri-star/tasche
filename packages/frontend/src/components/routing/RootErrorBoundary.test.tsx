import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RootErrorBoundary } from "./RootErrorBoundary"

const sentryCaptureException = vi.fn()
const mockUseRouteError = vi.fn()

vi.mock("@sentry/react", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
}))

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
  }
})

describe("RootErrorBoundary", () => {
  afterEach(() => {
    sentryCaptureException.mockClear()
    mockUseRouteError.mockClear()
  })

  it("useRouteError が返すエラーで Sentry.captureException が呼ばれること", () => {
    const error = new Error("boom")
    mockUseRouteError.mockReturnValue(error)

    render(<RootErrorBoundary />)

    expect(sentryCaptureException).toHaveBeenCalledWith(error)
  })

  it("フォールバックUI（AppErrorFallback）が描画されること", () => {
    mockUseRouteError.mockReturnValue(new Error("boom"))

    render(<RootErrorBoundary />)

    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument()
  })
})
