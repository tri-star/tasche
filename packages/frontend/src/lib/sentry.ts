import * as Sentry from "@sentry/react"
import { useEffect } from "react"
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom"
import { logger } from "@/lib/logger"

/**
 * イベント/ブレッドクラムのURLからマスクすべきクエリパラメータ名。
 *
 * OAuth認可コード(`code`)・CSRF対策の`state`は機密情報のため、
 * Sentryへ送信されるURLからは必ずマスクする（例: `/auth/callback?code=...&state=...`）。
 */
const SENSITIVE_QUERY_PARAM_NAMES = ["code", "state"]

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * URL文字列中の機密クエリパラメータ(`code`/`state`)の値を `[Filtered]` に置換する。
 *
 * 相対URL（例: `/auth/callback?code=...`）にも対応するため、パース用に仮のbase URLを与え、
 * 出力時は元のURLが絶対URLだったかどうかで絶対/相対を判定して復元する。
 * パースできないURLはそのまま返す（マスク漏れよりクラッシュ回避を優先）。
 */
function maskSensitiveQueryParams(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url, "http://sentry-masking.invalid")
  } catch {
    return url
  }

  let masked = false
  for (const paramName of SENSITIVE_QUERY_PARAM_NAMES) {
    if (parsed.searchParams.has(paramName)) {
      parsed.searchParams.set(paramName, "[Filtered]")
      masked = true
    }
  }

  if (!masked) {
    return url
  }

  return ABSOLUTE_URL_PATTERN.test(url)
    ? parsed.toString()
    : `${parsed.pathname}${parsed.search}${parsed.hash}`
}

/**
 * Breadcrumbの `data.url` に含まれる機密クエリパラメータをマスクする。
 * マスク不要（該当URLが無い/マスク対象パラメータが無い）な場合は同じ参照を返す。
 */
function maskBreadcrumbUrl(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  const url = breadcrumb.data?.url
  if (typeof url !== "string") {
    return breadcrumb
  }

  const maskedUrl = maskSensitiveQueryParams(url)
  if (maskedUrl === url) {
    return breadcrumb
  }

  return { ...breadcrumb, data: { ...breadcrumb.data, url: maskedUrl } }
}

/**
 * Sentryへ送信するイベントから機密情報を除去する。
 *
 * `request.url` および各breadcrumbの `data.url` に含まれるOAuthの `code`/`state` を
 * `[Filtered]` にマスクする（`AuthCallbackPage` の `/auth/callback?code=...&state=...` 対策）。
 */
function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request?.url) {
    event.request.url = maskSensitiveQueryParams(event.request.url)
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(maskBreadcrumbUrl)
  }

  return event
}

/**
 * ブレッドクラム記録時点で機密情報をマスクする（`beforeSend`のみだと、ドロップ判定等の
 * 他の処理がbreadcrumb内の生データを参照する余地が残るため、記録時点でもマスクしておく）。
 */
function beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  return maskBreadcrumbUrl(breadcrumb)
}

/**
 * `VITE_SENTRY_TRACES_SAMPLE_RATE` をパースする。
 *
 * `Number.parseFloat` は `"0.5abc"` のような部分一致も許容してしまうため、
 * 文字列全体が数値として解釈できるかを正規表現で検証したうえで数値化する。
 * さらに Sentry の仕様上有効な範囲である 0〜1 の範囲外の値も不正値として扱う。
 * 未設定・不正値・範囲外の場合は `0`（トレース無効、エラー捕捉のみ）にフォールバックする。
 */
function parseTracesSampleRate(rawValue: string | undefined): number {
  const trimmed = (rawValue ?? "").trim()

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return 0
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return 0
  }

  return parsed
}

/**
 * Sentry を初期化する。
 *
 * `VITE_SENTRY_DSN` が未設定（空文字含む）の場合は no-op とし、
 * ローカル開発/テスト環境でSentryへのネットワーク送信が発生しないようにする。
 *
 * StrictModeやコンポーネントの再マウントで多重初期化しないよう、
 * モジュールトップレベル（アプリ起動時）で1回だけ呼び出すこと。
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    logger.debug("Sentry disabled (no DSN)")
    return
  }

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE

  const tracesSampleRate = parseTracesSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate,
    beforeSend,
    beforeBreadcrumb,
  })
}
