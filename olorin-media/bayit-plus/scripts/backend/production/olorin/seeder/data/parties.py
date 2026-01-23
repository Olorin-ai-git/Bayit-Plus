"""
Political Parties Data

Israeli political parties for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

POLITICAL_PARTIES = [
    {
        "reference_id": "likud_party",
        "canonical_name": "הליכוד",
        "canonical_name_en": "Likud",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "political_party",
        "aliases": ["ליכוד", "מפלגת הליכוד"],
        "aliases_en": ["Likud Party"],
        "short_explanation": "מפלגה פוליטית ימנית-מרכזית בישראל",
        "short_explanation_en": "Center-right political party in Israel",
        "short_explanation_es": "Partido político de centroderecha en Israel",
        "relevance_keywords": ["ימין", "פוליטיקה", "בחירות"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "labor_party",
        "canonical_name": "מפלגת העבודה",
        "canonical_name_en": "Labor Party",
        "category": ReferenceCategory.ORGANIZATION,
        "subcategory": "political_party",
        "aliases": ["העבודה", "עבודה"],
        "aliases_en": ["Labor", "Avoda"],
        "short_explanation": "מפלגה פוליטית שמאלית-מרכזית בישראל, מפלגת המייסדים",
        "short_explanation_en": "Center-left political party in Israel, the founding party",
        "short_explanation_es": "Partido político de centroizquierda en Israel",
        "relevance_keywords": ["שמאל", "פוליטיקה", "היסטוריה"],
        "source": "manual",
        "verified": True,
    },
]
