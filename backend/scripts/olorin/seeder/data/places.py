"""
Notable Places Data

Israeli cities and landmarks for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

PLACES = [
    {
        "reference_id": "kotel",
        "canonical_name": "הכותל המערבי",
        "canonical_name_en": "Western Wall",
        "category": ReferenceCategory.PLACE,
        "subcategory": "religious",
        "aliases": ["הכותל", "כותל"],
        "aliases_en": ["Kotel", "Wailing Wall"],
        "short_explanation": "המקום הקדוש ביותר ליהודים, שריד בית המקדש בירושלים",
        "short_explanation_en": "The holiest site in Judaism, remnant of the Temple in Jerusalem",
        "short_explanation_es": "El sitio más sagrado del judaísmo, vestigio del Templo en Jerusalén",
        "relevance_keywords": ["ירושלים", "דת", "תפילה"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "tel_aviv",
        "canonical_name": "תל אביב",
        "canonical_name_en": "Tel Aviv",
        "category": ReferenceCategory.PLACE,
        "subcategory": "city",
        "aliases": ["תל אביב-יפו", "ת\"א"],
        "aliases_en": ["TLV"],
        "short_explanation": "העיר השנייה בגודלה בישראל, מרכז תרבותי וכלכלי",
        "short_explanation_en": "Second largest city in Israel, cultural and economic center",
        "short_explanation_es": "Segunda ciudad más grande de Israel, centro cultural y económico",
        "relevance_keywords": ["עיר", "תרבות", "חוף"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "jerusalem",
        "canonical_name": "ירושלים",
        "canonical_name_en": "Jerusalem",
        "category": ReferenceCategory.PLACE,
        "subcategory": "city",
        "aliases": ["עיר הקודש", "ירושלים עיר הקודש"],
        "aliases_en": ["The Holy City"],
        "short_explanation": "בירת ישראל, עיר קדושה לשלוש הדתות המונותאיסטיות",
        "short_explanation_en": "Capital of Israel, holy city for three monotheistic religions",
        "short_explanation_es": "Capital de Israel, ciudad sagrada para las tres religiones monoteístas",
        "relevance_keywords": ["בירה", "דת", "היסטוריה"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "eilat",
        "canonical_name": "אילת",
        "canonical_name_en": "Eilat",
        "category": ReferenceCategory.PLACE,
        "subcategory": "city",
        "aliases": [],
        "aliases_en": [],
        "short_explanation": "עיר נופש בדרום ישראל על חוף ים סוף",
        "short_explanation_en": "Resort city in southern Israel on the Red Sea coast",
        "short_explanation_es": "Ciudad turística en el sur de Israel en la costa del Mar Rojo",
        "relevance_keywords": ["תיירות", "חוף", "דרום"],
        "source": "manual",
        "verified": True,
    },
]
