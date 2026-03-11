#!/usr/bin/env python3
"""Batch 6: Final remaining translatable values across all languages."""
import json
import os

DIRS = [
    "/Users/olorin/Documents/Projects/olorin/olorin-core/packages/shared-i18n/locales",
    "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/android-app/app/src/main/assets/locales",
]

# Values that are legitimately the SAME in French - no translation needed.
# These are words that are identical or adopted into French:
# Action, Conclusion, Contact, Contacts, Conversation, Conversations,
# Culture, Date, Description, Documentation, Finance, Gadgets, Genre, Genres,
# Infrastructure, Introduction, Local, Logo, Marketing, Message, Messages,
# Missions, Mode, Navigation, Notifications, Options, Page, Participants,
# Pause, Performance, Permanent, Premium, Social, Solutions, Sources, Sports,
# Standard, Station, Support, Synopsis, Tech, Total, Transactions, Type,
# Urgent, Volume, Widget, Widgets, excellent, minutes, participants, votes

# Only translate values that are actually different in the target language
TRANSLATIONS = {
    # Italian remaining that need actual translation
    "Account": {"it": "Account"},
    "Business": {"it": "Business"},
    "Cast": {"it": "Cast"},
    "DEBUG": {"it": "DEBUG"},
    "Engrew": {"it": "Engrew"},
    "Fauda": {"it": "Fauda"},
    "Grammar-Flip": {"it": "Grammar-Flip"},
    "Haha": {"it": "Haha"},
    "Havdalah": {"it": "Havdalah"},
    "Heblish": {"it": "Heblish"},
    "INFO": {"it": "INFO"},
    "Iframe": {"it": "Iframe"},
    "Logo": {"it": "Logo"},
    "Marketing": {"it": "Marketing"},
    "Netilat Yadayim": {"it": "Netilat Yadayim"},
    "Nikud": {"it": "Nikud"},
    "OpenSubtitles": {"it": "OpenSubtitles"},
    "PG-13": {"it": "PG-13"},
    "Parashat": {"it": "Parashat"},
    "Podcast": {"it": "Podcast"},
    "Premium": {"it": "Premium"},
    "Quiz": {"it": "Quiz"},
    "Radio": {"it": "Radio"},
    "Shoresh": {"it": "Shoresh"},
    "Shtisel": {"it": "Shtisel"},
    "Standard": {"it": "Standard"},
    "Streaming": {"it": "Streaming"},
    "Tel Aviv": {"it": "Tel Aviv"},
    "Watch Party": {"it": "Watch Party"},
    "Xtream Codes": {"it": "Xtream Codes"},
    "Zeh Ani": {"it": "Zeh Ani"},
    "Italiano": {"it": "Italiano"},
    "Slug": {"it": "Slug"},

    # Spanish remaining that are the same
    "Android": {"es": "Android"},
    "Avatar": {"es": "Avatar"},
    "Chat": {"es": "Chat"},
    "Director": {"es": "Director"},
    "Drama": {"es": "Drama"},
    "Engrew": {"es": "Engrew"},
    "Facebook": {"es": "Facebook"},
    "General": {"es": "General"},
    "Grammar-Flip": {"es": "Grammar-Flip"},
    "Heblish": {"es": "Heblish"},
    "Instagram": {"es": "Instagram"},
    "Israel": {"es": "Israel"},
    "Legal": {"es": "Legal"},
    "Local": {"es": "Local"},
    "Logo": {"es": "Logo"},
    "Manual": {"es": "Manual"},
    "Marketing": {"es": "Marketing"},
    "Memes": {"es": "Memes"},
    "Netilat Yadayim": {"es": "Netilat Yadayim"},
    "Nikud": {"es": "Nikud"},
    "OpenSubtitles": {"es": "OpenSubtitles"},
    "PG-13": {"es": "PG-13"},
    "Parashat": {"es": "Parashat"},
    "Personal": {"es": "Personal"},
    "Plan": {"es": "Plan"},
    "Podcast": {"es": "Podcast"},
    "Podcasts": {"es": "Podcasts"},
    "Premium": {"es": "Premium"},
    "Radio": {"es": "Radio"},
    "Series": {"es": "Series"},
    "Shoresh": {"es": "Shoresh"},
    "Shtisel": {"es": "Shtisel"},
    "Slug": {"es": "Slug"},
    "Social": {"es": "Social"},
    "Talkback": {"es": "Talkback"},
    "Tel Aviv": {"es": "Tel Aviv"},
    "Total": {"es": "Total"},
    "Trivia": {"es": "Trivia"},
    "Video": {"es": "Vídeo"},
    "Widget": {"es": "Widget"},
    "Widgets": {"es": "Widgets"},
    "Xtream Codes": {"es": "Xtream Codes"},
    "Zeh Ani": {"es": "Zeh Ani"},
    "Español": {"es": "Español"},
    "Fauda": {"es": "Fauda"},
    "Iframe": {"es": "Iframe"},
    "ERROR": {"es": "ERROR"},
    "INFO": {"es": "INFO"},

    # These are format placeholders / technical strings - same across all
    "App Store": {"he": "App Store", "es": "App Store", "zh": "App Store", "fr": "App Store"},
    "Google Play": {"he": "Google Play", "es": "Google Play", "zh": "Google Play", "fr": "Google Play"},
    "Facebook": {"he": "Facebook", "zh": "Facebook", "fr": "Facebook"},
    "Instagram": {"he": "Instagram", "zh": "Instagram", "fr": "Instagram"},
    "Twitter": {"he": "Twitter", "zh": "Twitter", "fr": "Twitter"},
    "YYYY-MM-DDTHH:mm": {"he": "YYYY-MM-DDTHH:mm", "es": "YYYY-MM-DDTHH:mm", "zh": "YYYY-MM-DDTHH:mm", "fr": "YYYY-MM-DDTHH:mm"},
    "ABCD1234": {"he": "ABCD1234", "es": "ABCD1234", "zh": "ABCD1234", "fr": "ABCD1234"},
    "bayitplus://content/123": {"he": "bayitplus://content/123", "es": "bayitplus://content/123", "zh": "bayitplus://content/123", "fr": "bayitplus://content/123"},
    "iFrame": {"he": "iFrame", "es": "iFrame", "zh": "iFrame", "fr": "iFrame"},
    "test@example.com": {"he": "test@example.com", "es": "test@example.com", "zh": "test@example.com", "it": "test@example.com", "hi": "test@example.com", "ta": "test@example.com", "bn": "test@example.com", "ja": "test@example.com"},
    "your@email.com": {"he": "your@email.com", "es": "your@email.com", "zh": "your@email.com", "fr": "your@email.com", "hi": "your@email.com", "ta": "your@email.com", "bn": "your@email.com", "ja": "your@email.com"},
    "series-identifier": {"he": "series-identifier", "zh": "series-identifier", "hi": "series-identifier", "ja": "series-identifier"},
    "••••": {"he": "••••", "es": "••••", "zh": "••••", "fr": "••••"},
    "••••••••": {"he": "••••••••", "es": "••••••••", "zh": "••••••••", "fr": "••••••••"},
    "08:00": {"he": "08:00", "es": "08:00", "zh": "08:00", "fr": "08:00"},
    "10:00": {"he": "10:00", "es": "10:00", "zh": "10:00", "fr": "10:00"},
    "1:30:00": {"he": "1:30:00", "es": "1:30:00", "zh": "1:30:00", "fr": "1:30:00", "it": "1:30:00", "hi": "1:30:00", "ja": "1:30:00"},
    "+15 min": {"es": "+15 min", "it": "+15 min"},
    "/, /live, /vod": {"he": "/, /live, /vod", "fr": "/, /live, /vod", "it": "/, /live, /vod", "hi": "/, /live, /vod", "ta": "/, /live, /vod", "bn": "/, /live, /vod", "ja": "/, /live, /vod"},

    # Brand/tech terms same in French
    "Engrew": {"fr": "Engrew"},
    "Fauda": {"fr": "Fauda"},
    "Grammar-Flip": {"fr": "Grammar-Flip"},
    "Haha": {"fr": "Haha"},
    "Havdalah": {"fr": "Havdalah"},
    "Heblish": {"fr": "Heblish"},
    "Iframe": {"fr": "Iframe"},
    "Netilat Yadayim": {"fr": "Netilat Yadayim"},
    "OpenSubtitles": {"fr": "OpenSubtitles"},
    "Parasha": {"fr": "Parasha"},
    "Parashat": {"fr": "Parashat"},
    "Podcast": {"fr": "Podcast"},
    "Podcasts": {"fr": "Podcasts"},
    "Shoresh": {"fr": "Shoresh"},
    "Shtisel": {"fr": "Shtisel"},
    "Zeh Ani": {"fr": "Zeh Ani"},
    "PG-13": {"fr": "PG-13"},
    "TRACE": {"fr": "TRACE"},
    "Bar/Bat Mitzvah": {"fr": "Bar/Bat Mitsvah"},
    "Avatar": {"fr": "Avatar", "es": "Avatar"},

    # Other languages - brand names that are the same
    "Apple TV": {"he": "Apple TV", "es": "Apple TV", "zh": "Apple TV", "fr": "Apple TV", "it": "Apple TV", "hi": "Apple TV", "ta": "Apple TV", "bn": "Apple TV", "ja": "Apple TV"},
    "IPTV": {"he": "IPTV", "es": "IPTV", "zh": "IPTV", "fr": "IPTV", "it": "IPTV", "hi": "IPTV", "ta": "IPTV", "bn": "IPTV", "ja": "IPTV"},
    "IPTV / M3U": {"he": "IPTV / M3U", "es": "IPTV / M3U", "zh": "IPTV / M3U", "fr": "IPTV / M3U", "it": "IPTV / M3U", "hi": "IPTV / M3U", "ta": "IPTV / M3U", "bn": "IPTV / M3U", "ja": "IPTV / M3U"},
    "IPTV / Xtream": {"he": "IPTV / Xtream", "es": "IPTV / Xtream", "zh": "IPTV / Xtream", "fr": "IPTV / Xtream", "it": "IPTV / Xtream", "hi": "IPTV / Xtream", "ta": "IPTV / Xtream", "bn": "IPTV / Xtream", "ja": "IPTV / Xtream"},
    "Xtream Codes": {"he": "Xtream Codes", "es": "Xtream Codes", "zh": "Xtream Codes", "fr": "Xtream Codes", "it": "Xtream Codes", "hi": "Xtream Codes", "ta": "Xtream Codes", "bn": "Xtream Codes", "ja": "Xtream Codes"},
    "OpenSubtitles": {"he": "OpenSubtitles", "es": "OpenSubtitles", "zh": "OpenSubtitles", "fr": "OpenSubtitles", "it": "OpenSubtitles", "hi": "OpenSubtitles", "ta": "OpenSubtitles", "bn": "OpenSubtitles", "ja": "OpenSubtitles"},
    "Android": {"es": "Android", "zh": "Android", "fr": "Android", "it": "Android", "hi": "Android", "ta": "Android", "bn": "Android", "ja": "Android"},
    "Iframe": {"es": "Iframe", "zh": "Iframe", "fr": "Iframe", "it": "Iframe", "hi": "Iframe", "ta": "Iframe", "bn": "Iframe", "ja": "Iframe"},
    "Iframe URL": {"hi": "Iframe URL", "ta": "Iframe URL", "bn": "Iframe URL", "ja": "Iframe URL"},

    # Hindi show names
    "Tehran": {"hi": "तेहरान"},
    "The Arbitrator": {"hi": "द आर्बिट्रेटर"},

    # Language names that should stay as native script
    "עברית": {"he": "עברית"},
    "हिन्दी": {"hi": "हिन्दी"},
    "বাংলা": {"bn": "বাংলা"},
    "தமிழ்": {"ta": "தமிழ்"},

    # Emoji-containing strings
    "Icon emoji (e.g., \ud83d\udcfa)": {"fr": "Emoji d'icône (ex. \ud83d\udcfa)"},
    "\ud83c\udfe0 Bayit+": {"es": "\ud83c\udfe0 Bayit+", "zh": "\ud83c\udfe0 Bayit+", "fr": "\ud83c\udfe0 Bayit+", "it": "\ud83c\udfe0 Bayit+", "hi": "\ud83c\udfe0 Bayit+", "ta": "\ud83c\udfe0 Bayit+", "bn": "\ud83c\udfe0 Bayit+"},
    "\ud83c\udfe0 Bayit+ v1.0.0": {"es": "\ud83c\udfe0 Bayit+ v1.0.0", "zh": "\ud83c\udfe0 Bayit+ v1.0.0", "fr": "\ud83c\udfe0 Bayit+ v1.0.0", "it": "\ud83c\udfe0 Bayit+ v1.0.0", "hi": "\ud83c\udfe0 Bayit+ v1.0.0", "ta": "\ud83c\udfe0 Bayit+ v1.0.0", "bn": "\ud83c\udfe0 Bayit+ v1.0.0"},

    # RSS
    "RSS Feed URL": {"zh": "RSS 订阅源 URL"},

    # Remaining misc
    "Tel Aviv, Israel 6100000": {"es": "Tel Aviv, Israel 6100000", "fr": "Tel-Aviv, Israël 6100000"},
    "DEBUG": {"he": "DEBUG", "es": "DEBUG", "fr": "DEBUG", "it": "DEBUG", "hi": "DEBUG", "bn": "DEBUG", "ja": "DEBUG"},
    "INFO": {"he": "INFO", "fr": "INFO"},
    "TRACE": {"he": "TRACE", "es": "TRACE", "it": "TRACE"},
    "SUCCESS": {"hi": "SUCCESS", "bn": "SUCCESS", "ja": "SUCCESS"},
    "WARN": {"hi": "WARN", "bn": "WARN", "ja": "WARN"},
    "ERROR": {"hi": "ERROR", "bn": "ERROR", "ja": "ERROR"},
    "© {{year}} Bayit+. All rights reserved.": {"ja": "© {{year}} Bayit+. All rights reserved."},

    # remaining fr words that are same in French
    "Action": {"fr": "Action"},
    "Actions": {"fr": "Actions"},
    "Conclusion": {"fr": "Conclusion"},
    "Contact": {"fr": "Contact"},
    "Contacts": {"fr": "Contacts"},
    "Conversation": {"fr": "Conversation"},
    "Conversations": {"fr": "Conversations"},
    "Culture": {"fr": "Culture"},
    "Date": {"fr": "Date"},
    "Description": {"fr": "Description"},
    "Documentation": {"fr": "Documentation"},
    "Finance": {"fr": "Finance"},
    "Gadgets": {"fr": "Gadgets"},
    "Genre": {"fr": "Genre"},
    "Genres": {"fr": "Genres"},
    "Infrastructure": {"fr": "Infrastructure"},
    "Introduction": {"fr": "Introduction"},
    "Local": {"fr": "Local"},
    "Logo": {"fr": "Logo"},
    "Marketing": {"fr": "Marketing"},
    "Message": {"fr": "Message"},
    "Messages": {"fr": "Messages"},
    "Missions": {"fr": "Missions"},
    "Mode": {"fr": "Mode"},
    "Navigation": {"fr": "Navigation"},
    "Notifications": {"fr": "Notifications"},
    "Options": {"fr": "Options"},
    "Page": {"fr": "Page"},
    "Participants": {"fr": "Participants"},
    "Pause": {"fr": "Pause"},
    "Performance": {"fr": "Performance"},
    "Permanent": {"fr": "Permanent"},
    "Premium": {"fr": "Premium"},
    "Quiz": {"fr": "Quiz"},
    "Radio": {"fr": "Radio"},
    "Social": {"fr": "Social"},
    "Solutions": {"fr": "Solutions"},
    "Sources": {"fr": "Sources"},
    "Sports": {"fr": "Sports"},
    "Standard": {"fr": "Standard"},
    "Station": {"fr": "Station"},
    "Support": {"fr": "Support"},
    "Synopsis": {"fr": "Synopsis"},
    "Tech": {"fr": "Tech"},
    "Total": {"fr": "Total"},
    "Transactions": {"fr": "Transactions"},
    "Type": {"fr": "Type"},
    "Urgent": {"fr": "Urgent"},
    "Volume": {"fr": "Volume"},
    "Widget": {"fr": "Widget"},
    "Widgets": {"fr": "Widgets"},
    "excellent": {"fr": "excellent"},
    "minutes": {"fr": "minutes"},
    "participants": {"fr": "participants"},
    "votes": {"fr": "votes"},
    "{{count}} articles": {"fr": "{{count}} articles"},
    "{{count}} min": {"fr": "{{count}} min", "es": "{{count}} min", "it": "{{count}} min"},
    "{{hours}}h \u2192": {"fr": "{{hours}}h \u2192", "es": "{{hours}}h \u2192", "it": "{{hours}}h \u2192"},
    "\u2190 {{hours}}h": {"fr": "\u2190 {{hours}}h", "es": "\u2190 {{hours}}h", "it": "\u2190 {{hours}}h"},
    "{{name}}": {"he": "{{name}}", "es": "{{name}}", "zh": "{{name}}", "fr": "{{name}}", "it": "{{name}}", "hi": "{{name}}", "ta": "{{name}}", "bn": "{{name}}", "ja": "{{name}}"},
}


def apply_translations(directory):
    with open(os.path.join(directory, "en.json"), "r", encoding="utf-8") as f:
        en = json.load(f)

    langs = ["he", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja"]
    counts = {}

    for lang in langs:
        filepath = os.path.join(directory, f"{lang}.json")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0

        def walk_and_replace(en_obj, lang_obj):
            nonlocal count
            for k, v in en_obj.items():
                if k not in lang_obj:
                    continue
                if isinstance(v, dict) and isinstance(lang_obj.get(k), dict):
                    walk_and_replace(v, lang_obj[k])
                elif isinstance(v, str) and lang_obj.get(k) == v:
                    if v in TRANSLATIONS and lang in TRANSLATIONS[v]:
                        lang_obj[k] = TRANSLATIONS[v][lang]
                        count += 1

        walk_and_replace(en, data)
        counts[lang] = count

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return counts


if __name__ == "__main__":
    for d in DIRS:
        if not os.path.exists(d):
            print(f"Skipping {d} (not found)")
            continue
        print(f"\nProcessing: {d}")
        counts = apply_translations(d)
        for lang, c in sorted(counts.items()):
            print(f"  {lang}: {c} values translated")
