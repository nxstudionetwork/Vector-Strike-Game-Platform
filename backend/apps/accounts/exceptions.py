"""Consistent JSON error envelope: {"error": {"code", "message", "fields"?}}."""

from rest_framework.views import exception_handler


def _first_message(detail):
    if isinstance(detail, list) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict) and detail:
        return _first_message(next(iter(detail.values())))
    return str(detail)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    code = getattr(exc, "default_code", "error")
    payload = {"code": code, "message": _first_message(data)}
    if isinstance(data, dict) and "detail" not in data:
        payload["fields"] = {
            key: [str(m) for m in (value if isinstance(value, list) else [value])] for key, value in data.items()
        }
    elif isinstance(data, dict) and "detail" in data:
        payload["message"] = str(data["detail"])
    response.data = {"error": payload}
    return response
