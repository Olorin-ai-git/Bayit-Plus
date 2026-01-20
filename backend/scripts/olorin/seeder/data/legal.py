"""
Legal and Government Terms Data

Israeli legal and governmental institutions for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

LEGAL_TERMS = [
    {
        "reference_id": "knesset",
        "canonical_name": "הכנסת",
        "canonical_name_en": "Knesset",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "government",
        "aliases": ["כנסת ישראל", "בית הנבחרים"],
        "aliases_en": ["Israeli Parliament"],
        "short_explanation": "הפרלמנט של מדינת ישראל, 120 חברי כנסת",
        "short_explanation_en": "The parliament of Israel, consisting of 120 members",
        "short_explanation_es": "El parlamento de Israel, compuesto por 120 miembros",
        "relevance_keywords": ["חוק", "פוליטיקה", "דמוקרטיה"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "bagatz",
        "canonical_name": 'בג"ץ',
        "canonical_name_en": "Supreme Court",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "legal",
        "aliases": ["בית המשפט הגבוה לצדק", "בית המשפט העליון"],
        "aliases_en": ["High Court of Justice", "Bagatz"],
        "short_explanation": "בית המשפט העליון בישראל הדן בעתירות נגד רשויות המדינה",
        "short_explanation_en": "Israel's Supreme Court that hears petitions against state authorities",
        "short_explanation_es": "Tribunal Supremo de Israel que conoce peticiones contra autoridades estatales",
        "relevance_keywords": ["חוק", "משפט", "צדק"],
        "source": "manual",
        "verified": True,
    },
]
