#!/usr/bin/env python3
"""
Complete Spanish i18n Translations

Automatically translates missing Spanish translation keys using Claude API.
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple
from anthropic import Anthropic

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.config import settings


def load_json(file_path: Path) -> Dict[str, Any]:
    """Load JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(file_path: Path, data: Dict[str, Any]) -> None:
    """Save JSON file with proper formatting."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_all_keys(obj: Any, prefix: str = '') -> List[str]:
    """Get all nested keys from a dictionary."""
    keys = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                keys.extend(get_all_keys(value, full_key))
            else:
                keys.append(full_key)
    return keys


def get_value_by_path(obj: Dict[str, Any], path: str) -> Any:
    """Get value from nested dictionary by dot-separated path."""
    keys = path.split('.')
    value = obj
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return None
    return value


def set_value_by_path(obj: Dict[str, Any], path: str, value: Any) -> None:
    """Set value in nested dictionary by dot-separated path."""
    keys = path.split('.')
    target = obj
    for key in keys[:-1]:
        if key not in target:
            target[key] = {}
        target = target[key]
    target[keys[-1]] = value


def translate_text(text: str, client: Anthropic) -> str:
    """Translate English text to Spanish using Claude."""
    if not text or text.strip() == "":
        return ""

    prompt = f"""Translate the following English text to Spanish (español).
Return ONLY the Spanish translation, nothing else. No explanations, no additional text.
Maintain the same tone and style as the original.
If it's a technical term, use the appropriate Spanish equivalent.
If it contains placeholder variables like {{variable}}, keep them exactly as they are.

English text: {text}

Spanish translation:"""

    try:
        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CLAUDE_MAX_TOKENS_SHORT,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()
        response_text = response_text.replace("Translation:", "").replace("translation:", "")
        response_text = response_text.replace("Spanish:", "").replace("spanish:", "")
        response_text = response_text.strip().strip('"').strip("'")

        return response_text
    except Exception as e:
        print(f"    ✗ Error translating '{text[:50]}...': {e}")
        return text


def find_missing_translations(
    en_data: Dict[str, Any],
    es_data: Dict[str, Any]
) -> List[Tuple[str, str]]:
    """Find keys that exist in English but missing in Spanish."""
    en_keys = set(get_all_keys(en_data))
    es_keys = set(get_all_keys(es_data))

    missing_keys = en_keys - es_keys

    missing_translations = []
    for key in sorted(missing_keys):
        en_value = get_value_by_path(en_data, key)
        if isinstance(en_value, str):
            missing_translations.append((key, en_value))

    return missing_translations


def main():
    """Main execution function."""
    print("=" * 80)
    print("Spanish i18n Translation Completion")
    print("=" * 80)

    # Paths
    shared_i18n = Path("/Users/olorin/Documents/Bayit-Plus/shared/i18n/locales")
    en_path = shared_i18n / "en.json"
    es_path = shared_i18n / "es.json"

    # Load files
    print("\n📂 Loading translation files...")
    en_data = load_json(en_path)
    es_data = load_json(es_path)

    # Find missing translations
    print("🔍 Analyzing missing translations...")
    missing = find_missing_translations(en_data, es_data)

    if not missing:
        print("\n✅ Spanish translations are complete!")
        return

    print(f"\n📊 Found {len(missing)} missing translations")
    print("-" * 80)

    # Initialize Claude client
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Translate missing keys
    translated_count = 0
    error_count = 0

    for i, (key, en_value) in enumerate(missing, 1):
        print(f"\n[{i}/{len(missing)}] {key}")
        print(f"  EN: {en_value[:100]}...")

        try:
            es_value = translate_text(en_value, client)
            if es_value and es_value != en_value:
                set_value_by_path(es_data, key, es_value)
                print(f"  ES: {es_value[:100]}...")
                translated_count += 1
            else:
                print(f"  ⚠️  Translation unchanged or empty")
                error_count += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
            error_count += 1
            continue

    # Save updated Spanish translations
    print("\n" + "=" * 80)
    print("💾 Saving updated translations...")
    save_json(es_path, es_data)

    # Summary
    print("\n" + "=" * 80)
    print("✅ Translation Complete!")
    print(f"  Translated: {translated_count}")
    print(f"  Errors:     {error_count}")
    print(f"  Total:      {len(missing)}")
    print("=" * 80)

    # Verify
    print("\n🔍 Verifying completion...")
    es_data_new = load_json(es_path)
    remaining = find_missing_translations(en_data, es_data_new)

    if remaining:
        print(f"⚠️  Still {len(remaining)} keys missing (likely errors)")
    else:
        print("✅ All translations complete!")


if __name__ == "__main__":
    main()
