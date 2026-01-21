"""
Rate Limiting Configuration
Protects authentication endpoints from brute force attacks
"""

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    # Initialize rate limiter
    limiter = Limiter(key_func=get_remote_address)

    # Rate limit configurations
    RATE_LIMITS = {
        "login": "5/minute",  # 5 login attempts per minute
        "register": "3/hour",  # 3 registrations per hour
        "oauth_callback": "10/minute",  # 10 OAuth attempts per minute
        "password_reset": "3/hour",  # 3 password reset requests per hour
        "partner_register": "3/hour",  # 3 partner registrations per hour per IP
    }

    RATE_LIMITING_ENABLED = True

except ImportError:
    # Gracefully handle missing slowapi dependency
    import logging

    logger = logging.getLogger(__name__)
    logger.warning(
        "slowapi not installed - rate limiting disabled. Install with: pip install slowapi"
    )

    # Create dummy limiter that does nothing
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

    limiter = DummyLimiter()
    RATE_LIMITING_ENABLED = False
    RATE_LIMITS = {}
