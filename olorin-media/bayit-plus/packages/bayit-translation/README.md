# Bayit Translation

Multi-provider translation services with configurable settings.

## Features

- **Claude Translation**: Hebrew to English/Spanish translation using Anthropic's Claude
- **Async Support**: Async API for high-performance translation
- **Batch Translation**: Translate multiple fields efficiently
- **Quality Validation**: Automatic validation of translation quality

## Installation

```bash
poetry add bayit-translation
```

## Usage

```python
from bayit_translation import SimpleTranslationConfig, TranslationService

# Configure
config = SimpleTranslationConfig(
    anthropic_api_key="your-anthropic-api-key",
    claude_model="claude-sonnet-4-5-20250929",
    claude_max_tokens_short=300,
    claude_max_tokens_long=1000
)

# Use service
translator = TranslationService(config)

# Translate
result = translator.translate_text(
    text="שלום עולם",
    target_language_code="en"
)
print(result)  # "Hello World"

# Async translation
result = await translator.translate_field(
    source_text="טקסט עברי",
    target_language_code="es"
)
```

## Supported Languages

- English (`en`)
- Spanish (`es`)

## License

Proprietary - Bayit+ Team
