"""
Political Figures Data

Israeli political figures for the cultural references knowledge base.
"""

from app.models.cultural_reference import ReferenceCategory

POLITICIANS = [
    {
        "reference_id": "netanyahu_benjamin",
        "canonical_name": "בנימין נתניהו",
        "canonical_name_en": "Benjamin Netanyahu",
        "category": ReferenceCategory.PERSON,
        "subcategory": "politician",
        "aliases": ["ביבי", "נתניהו", "ראש הממשלה נתניהו"],
        "aliases_en": ["Bibi", "Netanyahu", "PM Netanyahu"],
        "short_explanation": "ראש ממשלת ישראל לשעבר ונוכחי, יושב ראש מפלגת הליכוד",
        "short_explanation_en": "Former and current Prime Minister of Israel, leader of the Likud party",
        "short_explanation_es": "Ex y actual Primer Ministro de Israel, líder del partido Likud",
        "relevance_keywords": ["פוליטיקה", "ממשלה", "ליכוד", "ימין"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "ben_gurion_david",
        "canonical_name": "דוד בן גוריון",
        "canonical_name_en": "David Ben-Gurion",
        "category": ReferenceCategory.PERSON,
        "subcategory": "politician",
        "aliases": ["הזקן", "בן גוריון"],
        "aliases_en": ["The Old Man", "Ben-Gurion"],
        "short_explanation": "ראש הממשלה הראשון של ישראל ומייסד המדינה",
        "short_explanation_en": "First Prime Minister of Israel and founder of the state",
        "short_explanation_es": "Primer ministro fundador de Israel",
        "relevance_keywords": ["היסטוריה", "עצמאות", "מייסדים"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "rabin_yitzhak",
        "canonical_name": "יצחק רבין",
        "canonical_name_en": "Yitzhak Rabin",
        "category": ReferenceCategory.PERSON,
        "subcategory": "politician",
        "aliases": ["רבין"],
        "aliases_en": ["Rabin"],
        "short_explanation": "ראש ממשלה לשעבר, חתן פרס נובל לשלום, נרצח ב-1995",
        "short_explanation_en": "Former Prime Minister, Nobel Peace Prize laureate, assassinated in 1995",
        "short_explanation_es": "Ex primer ministro, Premio Nobel de la Paz, asesinado en 1995",
        "relevance_keywords": ["שלום", "אוסלו", "רצח"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "golda_meir",
        "canonical_name": "גולדה מאיר",
        "canonical_name_en": "Golda Meir",
        "category": ReferenceCategory.PERSON,
        "subcategory": "politician",
        "aliases": ["גולדה"],
        "aliases_en": ["Golda"],
        "short_explanation": "ראשת הממשלה הרביעית של ישראל, האישה היחידה שכיהנה בתפקיד",
        "short_explanation_en": "Fourth Prime Minister of Israel, the only woman to hold the office",
        "short_explanation_es": "Cuarta Primera Ministra de Israel, la única mujer en ocupar el cargo",
        "relevance_keywords": ["מלחמת יום כיפור", "אישה", "מנהיגות"],
        "source": "manual",
        "verified": True,
    },
]
