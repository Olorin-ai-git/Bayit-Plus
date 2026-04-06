"""Task 2: share-token generator tests (D-09)."""
from app.services.olorin.comprehension.share_token import generate_share_token


def test_share_token_minimum_length() -> None:
    token = generate_share_token()
    assert len(token) >= 32, f"share token too short: {len(token)}"


def test_share_tokens_are_distinct() -> None:
    tokens = {generate_share_token() for _ in range(10)}
    assert len(tokens) == 10
