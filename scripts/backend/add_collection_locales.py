#!/usr/bin/env python3
"""
Add collection localization keys to all language files
"""

import json
import os

LOCALES_DIR = "../../packages/ui/bayit-i18n/locales"

# Translation data for each language
TRANSLATIONS = {
    "fr.json": {
        "collectionsOnly": "Collections",
        "moviesOnly": "Films",
        "seriesOnly": "Séries",
        "collection": {
            "playAll": "Tout lire",
            "movies": "films",
            "available": "de",
            "of": "de",
            "notFound": "Collection introuvable",
            "watchCollection": "Regarder la collection",
            "detail": "Détails de la collection"
        }
    },
    "it.json": {
        "collectionsOnly": "Collezioni",
        "moviesOnly": "Film",
        "seriesOnly": "Serie",
        "collection": {
            "playAll": "Riproduci tutto",
            "movies": "film",
            "available": "di",
            "of": "di",
            "notFound": "Collezione non trovata",
            "watchCollection": "Guarda la collezione",
            "detail": "Dettagli della collezione"
        }
    },
    "hi.json": {
        "collectionsOnly": "संग्रह",
        "moviesOnly": "फ़िल्में",
        "seriesOnly": "सीरीज़",
        "collection": {
            "playAll": "सभी चलाएं",
            "movies": "फ़िल्में",
            "available": "का",
            "of": "का",
            "notFound": "संग्रह नहीं मिला",
            "watchCollection": "संग्रह देखें",
            "detail": "संग्रह विवरण"
        }
    },
    "ta.json": {
        "collectionsOnly": "தொகுப்புகள்",
        "moviesOnly": "திரைப்படங்கள்",
        "seriesOnly": "தொடர்கள்",
        "collection": {
            "playAll": "அனைத்தையும் இயக்கு",
            "movies": "திரைப்படங்கள்",
            "available": "இல்",
            "of": "இல்",
            "notFound": "தொகுப்பு கிடைக்கவில்லை",
            "watchCollection": "தொகுப்பைப் பார்",
            "detail": "தொகுப்பு விவரங்கள்"
        }
    },
    "bn.json": {
        "collectionsOnly": "সংগ্রহ",
        "moviesOnly": "চলচ্চিত্র",
        "seriesOnly": "সিরিজ",
        "collection": {
            "playAll": "সব চালান",
            "movies": "চলচ্চিত্র",
            "available": "এর",
            "of": "এর",
            "notFound": "সংগ্রহ পাওয়া যায়নি",
            "watchCollection": "সংগ্রহ দেখুন",
            "detail": "সংগ্রহের বিবরণ"
        }
    },
    "ja.json": {
        "collectionsOnly": "コレクション",
        "moviesOnly": "映画",
        "seriesOnly": "シリーズ",
        "collection": {
            "playAll": "すべて再生",
            "movies": "映画",
            "available": "の",
            "of": "の",
            "notFound": "コレクションが見つかりません",
            "watchCollection": "コレクションを見る",
            "detail": "コレクションの詳細"
        }
    },
    "zh.json": {
        "collectionsOnly": "合集",
        "moviesOnly": "电影",
        "seriesOnly": "剧集",
        "collection": {
            "playAll": "播放全部",
            "movies": "电影",
            "available": "的",
            "of": "的",
            "notFound": "未找到合集",
            "watchCollection": "观看合集",
            "detail": "合集详情"
        }
    }
}

def add_collections_to_file(filepath, translations):
    """Add collection translations to a locale file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Check if vod section exists
        if 'vod' not in data:
            print(f"Warning: No 'vod' section in {filepath}")
            return False

        # Check if already added
        if 'collectionsOnly' in data['vod']:
            print(f"Already has collections: {filepath}")
            return False

        # Add the new keys
        data['vod'].update(translations)

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ Added collections to: {filepath}")
        return True

    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    # Get absolute path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    locales_dir = os.path.join(script_dir, LOCALES_DIR)

    print(f"Locales directory: {locales_dir}")
    print("=" * 60)

    updated_count = 0
    for filename, translations in TRANSLATIONS.items():
        filepath = os.path.join(locales_dir, filename)
        if os.path.exists(filepath):
            if add_collections_to_file(filepath, translations):
                updated_count += 1
        else:
            print(f"⚠️  File not found: {filepath}")

    print("=" * 60)
    print(f"Updated {updated_count} locale files")

if __name__ == "__main__":
    main()
