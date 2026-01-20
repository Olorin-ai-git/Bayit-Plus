"""
Military Terms Data

IDF and military terminology for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

MILITARY_TERMS = [
    {
        "reference_id": "idf",
        "canonical_name": "צה\"ל",
        "canonical_name_en": "IDF",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "military",
        "aliases": ["צבא הגנה לישראל", "הצבא"],
        "aliases_en": ["Israel Defense Forces", "Israeli Army"],
        "short_explanation": "צבא ההגנה לישראל, הכוח הצבאי של מדינת ישראל",
        "short_explanation_en": "Israel Defense Forces, the military forces of Israel",
        "short_explanation_es": "Fuerzas de Defensa de Israel, las fuerzas militares del estado",
        "relevance_keywords": ["צבא", "ביטחון", "שירות"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "mossad",
        "canonical_name": "המוסד",
        "canonical_name_en": "Mossad",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "intelligence",
        "aliases": ["מוסד", "המוסד למודיעין ולתפקידים מיוחדים"],
        "aliases_en": ["The Mossad", "Israeli Intelligence"],
        "short_explanation": "סוכנות המודיעין הלאומית של ישראל",
        "short_explanation_en": "Israel's national intelligence agency",
        "short_explanation_es": "Agencia nacional de inteligencia de Israel",
        "relevance_keywords": ["מודיעין", "ביטחון", "ריגול"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "shin_bet",
        "canonical_name": "שב\"כ",
        "canonical_name_en": "Shin Bet",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "intelligence",
        "aliases": ["שירות הביטחון הכללי", "השב\"כ"],
        "aliases_en": ["Shabak", "ISA"],
        "short_explanation": "שירות הביטחון הפנימי של ישראל",
        "short_explanation_en": "Israel's internal security service",
        "short_explanation_es": "Servicio de seguridad interna de Israel",
        "relevance_keywords": ["ביטחון", "מודיעין"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "miluim",
        "canonical_name": "מילואים",
        "canonical_name_en": "Reserve duty",
        "category": ReferenceCategory.TERM,
        "subcategory": "military",
        "aliases": ["שירות מילואים"],
        "aliases_en": ["Miluim"],
        "short_explanation": "שירות צבאי תקופתי של חיילים ששוחררו משירות סדיר",
        "short_explanation_en": "Periodic military service by soldiers who completed regular service",
        "short_explanation_es": "Servicio militar periódico de reservistas",
        "relevance_keywords": ["צבא", "שירות"],
        "source": "manual",
        "verified": True,
    },
]
