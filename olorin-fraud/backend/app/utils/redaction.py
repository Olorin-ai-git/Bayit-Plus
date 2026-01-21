import re
from typing import Any, Dict

_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{16,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{16,}"),
]

_PII_PATTERNS = [
    re.compile(r"[\w\.-]+@[\w\.-]+\.[A-Za-z]{2,}"),
    re.compile(r"\b\d{3}[- .]?\d{2}[- .]?\d{4}\b"),  # SSN-like
    re.compile(r"\b\+?\d{1,3}?[- .]?\(?\d{2,4}\)?[- .]?\d{3,4}[- .]?\d{3,4}\b"),
]


def redact_text(text: str) -> str:
    redacted = text
    for pat in _SECRET_PATTERNS:
        redacted = pat.sub("[REDACTED_SECRET]", redacted)
    for pat in _PII_PATTERNS:
        redacted = pat.sub("[REDACTED]", redacted)
    return redacted


def redact_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    def _redact(value: Any) -> Any:
        if isinstance(value, str):
            return redact_text(value)
        if isinstance(value, dict):
            return {k: _redact(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_redact(v) for v in value]
        return value

    return _redact(payload)  # type: ignore
