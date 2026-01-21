"""
Historical Events Data

Israeli historical events for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

HISTORICAL_EVENTS = [
    {
        "reference_id": "independence_1948",
        "canonical_name": "הכרזת העצמאות",
        "canonical_name_en": "Declaration of Independence",
        "category": ReferenceCategory.EVENT,
        "subcategory": "historical",
        "aliases": ["יום העצמאות", "הקמת המדינה", "1948"],
        "aliases_en": ["Israeli Independence", "1948"],
        "short_explanation": "הכרזת הקמת מדינת ישראל ב-14 במאי 1948",
        "short_explanation_en": "Declaration of the State of Israel on May 14, 1948",
        "short_explanation_es": "Declaración del Estado de Israel el 14 de mayo de 1948",
        "relevance_keywords": ["היסטוריה", "עצמאות", "בן גוריון"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "six_day_war",
        "canonical_name": "מלחמת ששת הימים",
        "canonical_name_en": "Six-Day War",
        "category": ReferenceCategory.EVENT,
        "subcategory": "historical",
        "aliases": ["מלחמת 67", "1967"],
        "aliases_en": ["1967 War"],
        "short_explanation": "מלחמה שניהלה ישראל ב-1967 נגד מצרים, סוריה וירדן",
        "short_explanation_en": "War fought by Israel in 1967 against Egypt, Syria, and Jordan",
        "short_explanation_es": "Guerra librada por Israel en 1967 contra Egipto, Siria y Jordania",
        "relevance_keywords": ["מלחמה", "היסטוריה", "ירושלים"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "yom_kippur_war",
        "canonical_name": "מלחמת יום כיפור",
        "canonical_name_en": "Yom Kippur War",
        "category": ReferenceCategory.EVENT,
        "subcategory": "historical",
        "aliases": ["מלחמת 73", "1973"],
        "aliases_en": ["1973 War", "October War"],
        "short_explanation": "מלחמה שפרצה ב-1973 כשמצרים וסוריה תקפו את ישראל ביום כיפור",
        "short_explanation_en": "War that began in 1973 when Egypt and Syria attacked Israel on Yom Kippur",
        "short_explanation_es": "Guerra que comenzó en 1973 cuando Egipto y Siria atacaron a Israel",
        "relevance_keywords": ["מלחמה", "היסטוריה", "גולדה מאיר"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "oslo_accords",
        "canonical_name": "הסכמי אוסלו",
        "canonical_name_en": "Oslo Accords",
        "category": ReferenceCategory.EVENT,
        "subcategory": "historical",
        "aliases": ["אוסלו", "הסכם אוסלו"],
        "aliases_en": ["Oslo", "Oslo Peace Process"],
        "short_explanation": 'הסכמי שלום בין ישראל לאש"ף שנחתמו ב-1993',
        "short_explanation_en": "Peace agreements between Israel and PLO signed in 1993",
        "short_explanation_es": "Acuerdos de paz entre Israel y la OLP firmados en 1993",
        "relevance_keywords": ["שלום", "רבין", "ערפאת"],
        "source": "manual",
        "verified": True,
    },
]
