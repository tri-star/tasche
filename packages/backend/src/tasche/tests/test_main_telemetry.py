"""テレメトリ補助処理のテスト."""

from starlette.requests import Request

from tasche.main import _set_http_span_attributes_from_request


class DummySpan:
    """OpenTelemetry span の最小テストダブル."""

    def __init__(self) -> None:
        self.name = ""
        self.attributes: dict[str, str] = {}

    def is_recording(self) -> bool:
        return True

    def update_name(self, name: str) -> None:
        self.name = name

    def set_attribute(self, key: str, value: str) -> None:
        self.attributes[key] = value


def test_set_http_span_attributes_uses_route_and_removes_query_string() -> None:
    """API識別用のHTTP属性をquery stringなしでspanへ付与する."""
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "scheme": "https",
            "path": "/api/tasks/01HZ",
            "query_string": b"code=secret",
            "headers": [(b"host", b"example.com")],
            "server": ("example.com", 443),
            "client": ("127.0.0.1", 12345),
            "route": type("Route", (), {"path": "/api/tasks/{task_id}"})(),
        }
    )
    span = DummySpan()

    _set_http_span_attributes_from_request(span, request)

    assert span.name == "GET /api/tasks/{task_id}"
    assert span.attributes["aws.local.operation"] == "GET /api/tasks/{task_id}"
    assert span.attributes["http.method"] == "GET"
    assert span.attributes["http.route"] == "/api/tasks/{task_id}"
    assert span.attributes["http.target"] == "/api/tasks/01HZ"
    assert span.attributes["http.url"] == "https://example.com/api/tasks/01HZ"
    assert span.attributes["url.full"] == "https://example.com/api/tasks/01HZ"
    assert span.attributes["url.path"] == "/api/tasks/01HZ"
    assert span.attributes["tasche.http.operation"] == "GET /api/tasks/{task_id}"
    assert span.attributes["tasche.http.url"] == "https://example.com/api/tasks/01HZ"
