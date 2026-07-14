import { afterEach, describe, expect, it, vi } from "vitest"

const sentryInit = vi.fn()
const mockIntegrationInstance = { name: "MockIntegration" }
const reactRouterBrowserTracingIntegration = vi.fn((_options: unknown) => mockIntegrationInstance)

vi.mock("@sentry/react", () => ({
  init: (...args: unknown[]) => sentryInit(...args),
  reactRouterBrowserTracingIntegration: (options: unknown) =>
    reactRouterBrowserTracingIntegration(options),
}))

describe("initSentry", () => {
  afterEach(() => {
    sentryInit.mockClear()
    reactRouterBrowserTracingIntegration.mockClear()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("VITE_SENTRY_DSN が未設定の場合、Sentry.init を呼ばない", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).not.toHaveBeenCalled()
  })

  it("VITE_SENTRY_DSN が設定されている場合、Sentry.init を1回呼び、期待する引数を渡す", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "staging")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "0.5")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledOnce()
    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://example.ingest.sentry.io/123",
        environment: "staging",
        tracesSampleRate: 0.5,
      }),
    )
  })

  it("integrations に reactRouterBrowserTracingIntegration の戻り値が含まれること", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(reactRouterBrowserTracingIntegration).toHaveBeenCalledOnce()
    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [mockIntegrationInstance],
      }),
    )
  })

  it("VITE_SENTRY_TRACES_SAMPLE_RATE が不正値（数値以外）の場合、tracesSampleRate は 0 にフォールバックする", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "not-a-number")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0,
      }),
    )
  })

  it("VITE_SENTRY_TRACES_SAMPLE_RATE が部分一致の数値（例: '0.5abc'）の場合、tracesSampleRate は 0 にフォールバックする", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "0.5abc")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0,
      }),
    )
  })

  it.each([
    "1.5",
    "-0.1",
    "2",
    "-1",
  ])("VITE_SENTRY_TRACES_SAMPLE_RATE が 0〜1 の範囲外(%s)の場合、tracesSampleRate は 0 にフォールバックする", async (rate) => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", rate)

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0,
      }),
    )
  })

  it.each([
    "0",
    "1",
    "0.25",
  ])("VITE_SENTRY_TRACES_SAMPLE_RATE が 0〜1 の範囲内(%s)の場合、そのまま採用する", async (rate) => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", rate)

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: Number(rate),
      }),
    )
  })

  it("VITE_SENTRY_ENVIRONMENT が未設定の場合、MODE をフォールバックとして使う", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")
    vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "")

    const { initSentry } = await import("./sentry")
    initSentry()

    expect(sentryInit).toHaveBeenCalledOnce()
    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: import.meta.env.MODE,
      }),
    )
  })

  describe("beforeSend", () => {
    async function getBeforeSend() {
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")

      const { initSentry } = await import("./sentry")
      initSentry()

      const [initArgs] = sentryInit.mock.calls[0]
      return (initArgs as { beforeSend: (event: unknown) => unknown }).beforeSend
    }

    it("event.request.url の code/state クエリパラメータをマスクする", async () => {
      const beforeSend = await getBeforeSend()

      const event = {
        request: {
          url: "https://app.example.com/auth/callback?code=super-secret&state=abc123&foo=bar",
        },
      }

      const result = beforeSend(event) as typeof event

      expect(result.request.url).toBe(
        "https://app.example.com/auth/callback?code=%5BFiltered%5D&state=%5BFiltered%5D&foo=bar",
      )
    })

    it("event.request.url が相対URLの場合もマスクする", async () => {
      const beforeSend = await getBeforeSend()

      const event = {
        request: {
          url: "/auth/callback?code=super-secret&state=abc123",
        },
      }

      const result = beforeSend(event) as typeof event

      expect(result.request.url).toBe("/auth/callback?code=%5BFiltered%5D&state=%5BFiltered%5D")
    })

    it("breadcrumbs[].data.url の code/state クエリパラメータをマスクする", async () => {
      const beforeSend = await getBeforeSend()

      const event = {
        breadcrumbs: [
          {
            category: "navigation",
            data: { url: "/auth/callback?code=super-secret&state=abc123" },
          },
          { category: "ui.click", data: { url: "/dashboard" } },
        ],
      }

      const result = beforeSend(event) as typeof event

      expect(result.breadcrumbs?.[0].data?.url).toBe(
        "/auth/callback?code=%5BFiltered%5D&state=%5BFiltered%5D",
      )
      expect(result.breadcrumbs?.[1].data?.url).toBe("/dashboard")
    })

    it("マスク対象のクエリパラメータが無い場合はURLを変更しない", async () => {
      const beforeSend = await getBeforeSend()

      const event = {
        request: { url: "https://app.example.com/dashboard?foo=bar" },
      }

      const result = beforeSend(event) as typeof event

      expect(result.request.url).toBe("https://app.example.com/dashboard?foo=bar")
    })
  })

  describe("beforeBreadcrumb", () => {
    async function getBeforeBreadcrumb() {
      vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/123")

      const { initSentry } = await import("./sentry")
      initSentry()

      const [initArgs] = sentryInit.mock.calls[0]
      return (initArgs as { beforeBreadcrumb: (breadcrumb: unknown) => unknown }).beforeBreadcrumb
    }

    it("breadcrumb.data.url の code/state クエリパラメータをマスクする", async () => {
      const beforeBreadcrumb = await getBeforeBreadcrumb()

      const breadcrumb = {
        category: "navigation",
        data: { url: "/auth/callback?code=super-secret&state=abc123" },
      }

      const result = beforeBreadcrumb(breadcrumb) as typeof breadcrumb

      expect(result.data.url).toBe("/auth/callback?code=%5BFiltered%5D&state=%5BFiltered%5D")
    })
  })
})
