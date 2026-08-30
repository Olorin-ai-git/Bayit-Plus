from unittest.mock import MagicMock, patch

from bayit_translation import SimpleTranslationConfig, TranslationService


def _config() -> SimpleTranslationConfig:
    return SimpleTranslationConfig(anthropic_api_key="translation-test-key")


def test_documented_constructor_builds_default_client() -> None:
    default_client = MagicMock()
    with patch(
        "bayit_translation.service.Anthropic",
        return_value=default_client,
    ) as constructor:
        service = TranslationService(_config())

    constructor.assert_called_once_with(api_key="translation-test-key")
    assert service.client is default_client


def test_constructor_preserves_explicit_client_injection() -> None:
    injected_client = MagicMock()
    with patch("bayit_translation.service.Anthropic") as constructor:
        service = TranslationService(_config(), client=injected_client)

    constructor.assert_not_called()
    assert service.client is injected_client
