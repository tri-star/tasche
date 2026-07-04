"""FastAPI アプリケーション初期化."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from tasche.api.v1.router import api_router
from tasche.core.config import settings
from tasche.core.csrf import CSRFMiddleware
from tasche.core.exceptions import (
    AuthenticationError,
    InvalidAuthorizationCodeError,
    InvalidTokenError,
    TaskNotFoundException,
    UserNotFoundException,
    ValidationError,
    WeekNotFoundException,
)


def _install_otel_log_record_defaults() -> None:
    """OTel未初期化時でもテレメトリ用ログ形式が壊れないようにする."""
    previous_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = previous_factory(*args, **kwargs)
        for field in ("otelTraceID", "otelSpanID", "otelServiceName"):
            if not hasattr(record, field):
                setattr(record, field, "-")
        return record

    logging.setLogRecordFactory(record_factory)


if settings.enable_telemetry:
    _install_otel_log_record_defaults()
    log_format = (
        "%(asctime)s - %(name)s - %(levelname)s - "
        "trace_id=%(otelTraceID)s span_id=%(otelSpanID)s - %(message)s"
    )
else:
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format=log_format,
    force=settings.enable_telemetry,
)

# Lambda + Parameters and Secrets Lambda Extension 構成における起動シーケンス:
#   1. uvicorn が import を完了し、ASGI startup を即時完了する
#      (Settings() は env 変数のみで初期化、Secret 取得は遅延)
#   2. /health が応答可能になり、Lambda Web Adapter の readiness check が通過
#   3. Lambda が invoke を開始
#   4. 最初の /api/* リクエストで require_secrets_resolved dependency が
#      Secret を取得 (この時点では Extension の登録が完了している)
# lifespan で Secret 取得をすると ASGI startup が完了せず /health が
# 応答できないため、dependency 方式に分離している。

app = FastAPI(
    title="Tasche API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


def _safe_request_url(request: Request) -> str:
    """クエリ文字列を除いたURLを返す."""
    return str(request.url.replace(query=None))


def _resolve_full_route_path(app: FastAPI | None, route: object) -> str | None:
    """マッチした route から prefix を含む完全なパスパターンを解決する.

    FastAPI 0.137 でルーターの内部構造がツリー化され、ネストした
    include_router() の prefix が `route.path` に反映されなくなった
    (`scope["route"]` は各ルーターの生の APIRoute を指すため、
    `/{item_id}` のように末端の断片しか得られない)。
    そのため `iter_route_contexts()` で全ルートの実効パス
    (prefix 結合済み) を辿り、一致する route を探して補完する。
    参照: https://github.com/fastapi/fastapi/releases/tag/0.137.0
    """
    if route is None:
        return None

    if app is not None:
        from fastapi.routing import iter_route_contexts

        for context in iter_route_contexts(app.routes):
            if context.original_route is route:
                return context.path

    return getattr(route, "path", None)


def _route_path(request: Request) -> str:
    """FastAPI が解決したルートパターンを取得する."""
    route = request.scope.get("route")
    path = _resolve_full_route_path(request.scope.get("app"), route)
    return path or request.url.path


def _set_http_span_attributes(request: Request) -> None:
    """CloudWatch のトレース一覧でAPIを識別しやすい属性を補完する."""
    from opentelemetry import trace

    span = trace.get_current_span()
    _set_http_span_attributes_from_request(span, request)


def _set_http_span_attributes_from_request(span, request: Request) -> None:
    """Request からHTTP span属性を補完する."""
    if not span.is_recording():
        return

    method = request.method
    route_path = _route_path(request)
    url_without_query = _safe_request_url(request)
    operation = f"{method} {route_path}"

    span.update_name(operation)
    span.set_attribute("aws.local.operation", operation)
    span.set_attribute("http.method", method)
    span.set_attribute("http.route", route_path)
    span.set_attribute("http.target", request.url.path)
    span.set_attribute("http.url", url_without_query)
    span.set_attribute("http.request.method", method)
    span.set_attribute("url.full", url_without_query)
    span.set_attribute("url.path", request.url.path)
    span.set_attribute("tasche.http.operation", operation)
    span.set_attribute("tasche.http.url", url_without_query)


def _set_http_span_attributes_from_scope(span, scope) -> None:
    """FastAPI instrumentation hook からHTTP span属性を補完する."""
    if not span.is_recording():
        return

    method = scope.get("method")
    if not method:
        return

    path = scope.get("path") or "/"
    route = scope.get("route")
    route_path = _resolve_full_route_path(scope.get("app"), route) or path
    operation = f"{method} {route_path}"

    span.update_name(operation)
    span.set_attribute("aws.local.operation", operation)
    span.set_attribute("http.method", method)
    span.set_attribute("http.route", route_path)
    span.set_attribute("http.target", path)
    span.set_attribute("http.request.method", method)
    span.set_attribute("url.path", path)
    span.set_attribute("tasche.http.operation", operation)


def _otel_server_request_hook(span, scope) -> None:
    _set_http_span_attributes_from_scope(span, scope)


def _otel_client_response_hook(span, scope, message) -> None:
    if message.get("type") == "http.response.start":
        _set_http_span_attributes_from_scope(span, scope)


if settings.enable_telemetry:

    @app.middleware("http")
    async def enrich_http_trace_attributes(request: Request, call_next):
        response = await call_next(request)
        _set_http_span_attributes(request)
        return response

    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls=r"^https?://[^/]+/health$|^/health$|^https?://[^/]+/$|^/$",
        server_request_hook=_otel_server_request_hook,
        client_response_hook=_otel_client_response_hook,
    )

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# CSRF 対策ミドルウェア（CORS より内側に登録）
app.add_middleware(CSRFMiddleware)


# 例外ハンドラー（レスポンス形式: {"error": {"code": ..., "message": ...}}）
@app.exception_handler(UserNotFoundException)
async def user_not_found_handler(request: Request, exc: UserNotFoundException):
    """ユーザー未発見例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": {"code": "USER_NOT_FOUND", "message": str(exc)}},
    )


@app.exception_handler(TaskNotFoundException)
async def task_not_found_handler(request: Request, exc: TaskNotFoundException):
    """タスク未発見例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": {"code": "TASK_NOT_FOUND", "message": str(exc)}},
    )


@app.exception_handler(WeekNotFoundException)
async def week_not_found_handler(request: Request, exc: WeekNotFoundException):
    """週未発見例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": {"code": "WEEK_NOT_FOUND", "message": str(exc)}},
    )


@app.exception_handler(InvalidTokenError)
async def invalid_token_handler(request: Request, exc: InvalidTokenError):
    """無効トークン例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": {"code": "INVALID_TOKEN", "message": exc.detail}},
    )


@app.exception_handler(InvalidAuthorizationCodeError)
async def invalid_authorization_code_handler(request: Request, exc: InvalidAuthorizationCodeError):
    """無効認可コード例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": "INVALID_AUTHORIZATION_CODE", "message": exc.detail}},
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """バリデーションエラー例外ハンドラー."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": "VALIDATION_ERROR", "message": exc.detail}},
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    """認証エラー例外ハンドラー（基底クラス）."""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": {"code": "AUTHENTICATION_ERROR", "message": str(exc)}},
    )


# API v1 ルーター登録
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """ルートエンドポイント（ヘルスチェック）."""
    return {"status": "ok", "message": "Tasche API is running"}


@app.get("/health")
async def health():
    """ヘルスチェックエンドポイント."""
    return {"status": "healthy"}
