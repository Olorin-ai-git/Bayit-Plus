"""OAuth helper utilities for Audible integration.

Provides PKCE support and state token management for secure OAuth flows.
"""

import secrets
import hashlib
import base64


def generate_pkce_pair() -> tuple[str, str]:
    """Generate PKCE code verifier and challenge pair.

    Returns:
        Tuple of (code_verifier, code_challenge) for use in OAuth flow
    """
    # Generate a random 43-128 character code_verifier
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("utf-8")
    code_verifier = code_verifier.rstrip("=")  # Remove padding

    # Create code_challenge from verifier using SHA256
    code_sha = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    code_challenge = base64.urlsafe_b64encode(code_sha).decode("utf-8")
    code_challenge = code_challenge.rstrip("=")  # Remove padding

    return code_verifier, code_challenge


def generate_state_token() -> str:
    """Generate a secure CSRF protection state token.

    Returns:
        Random state token for OAuth flow
    """
    return secrets.token_urlsafe(32)
