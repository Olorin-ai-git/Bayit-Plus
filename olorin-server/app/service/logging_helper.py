import logging
from contextlib import contextmanager
from contextvars import ContextVar, Token

# Logging approach based on https://github.olorin.com/global-core/global-content-service/blob/master/app/logs.py

# Use an immutable frozenset so resets on state can point to a different object
# A dictionary would reset to the same dictionary, while the items inside remained the
# same.
_logging_request_context: ContextVar[frozenset] = ContextVar(
    "logging_context", default=frozenset()
)


def reset_context(state: Token):
    """Resets the state of the logging context to that at the given state."""
    _logging_request_context.reset(state)


def update_context(**kwargs) -> Token:
    """Updates the state of the logging context.
    Returns a token that can be used to recover the previous state using `reset_context`
    """
    context = _logging_request_context.get()
    return _logging_request_context.set(context.union(kwargs.items()))


@contextmanager
def logging_context(**kwargs):
    token = update_context(**kwargs)
    try:
        yield
    finally:
        reset_context(token)


class RequestFormatter(logging.Formatter):
    def format(self, record):
        ctx = _logging_request_context.get()
        record.context = ", ".join(f"{k}={v}" for k, v in ctx)
        return super().format(record)
