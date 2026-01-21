"""
Cultural Figures Data

Israeli artists, writers, and cultural icons for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

CULTURAL_FIGURES = [
    {
        "reference_id": "arik_einstein",
        "canonical_name": "אריק איינשטיין",
        "canonical_name_en": "Arik Einstein",
        "category": ReferenceCategory.PERSON,
        "subcategory": "artist",
        "aliases": ["אריק"],
        "aliases_en": ["Arik"],
        "short_explanation": "זמר ושחקן ישראלי אגדי, מסמלי התרבות הישראלית",
        "short_explanation_en": "Legendary Israeli singer and actor, icon of Israeli culture",
        "short_explanation_es": "Legendario cantante y actor israelí, ícono de la cultura israelí",
        "relevance_keywords": ["מוזיקה", "תרבות", "שירים"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "amos_oz",
        "canonical_name": "עמוס עוז",
        "canonical_name_en": "Amos Oz",
        "category": ReferenceCategory.PERSON,
        "subcategory": "writer",
        "aliases": [],
        "aliases_en": [],
        "short_explanation": "סופר ישראלי בינלאומי, מאבות 'שלום עכשיו'",
        "short_explanation_en": "Internationally acclaimed Israeli author, peace activist",
        "short_explanation_es": "Autor israelí de renombre internacional, activista por la paz",
        "relevance_keywords": ["ספרות", "שלום", "תרבות"],
        "source": "manual",
        "verified": True,
    },
]
