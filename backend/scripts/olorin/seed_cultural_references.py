"""
Olorin.ai Cultural References Seeder

Seeds the cultural reference knowledge base with Israeli/Jewish cultural references.

Usage:
    poetry run python -m scripts.olorin.seed_cultural_references

Categories seeded:
    - Israeli politicians (current & historical)
    - Political parties
    - Israeli laws & legal terms
    - Hebrew slang & idioms
    - Jewish holidays & traditions
    - Historical events
    - IDF terminology
    - Notable places
    - Cultural figures
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.cultural_reference import CulturalReference, ReferenceCategory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Cultural reference data organized by category
CULTURAL_REFERENCES: List[dict] = [
    # === POLITICAL FIGURES ===
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
    # === POLITICAL PARTIES ===
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
    # === HOLIDAYS ===
    {
        "reference_id": "yom_kippur",
        "canonical_name": "יום כיפור",
        "canonical_name_en": "Yom Kippur",
        "category": ReferenceCategory.EVENT,
        "subcategory": "holiday",
        "aliases": ["יום הכיפורים", "יוה\"כ"],
        "aliases_en": ["Day of Atonement"],
        "short_explanation": "היום הקדוש ביותר ביהדות, יום צום וכפרה",
        "short_explanation_en": "The holiest day in Judaism, a day of fasting and atonement",
        "short_explanation_es": "El día más sagrado del judaísmo, día de ayuno y expiación",
        "relevance_keywords": ["חג", "צום", "דת", "כפרה"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "pesach",
        "canonical_name": "פסח",
        "canonical_name_en": "Passover",
        "category": ReferenceCategory.EVENT,
        "subcategory": "holiday",
        "aliases": ["חג הפסח", "חג המצות"],
        "aliases_en": ["Pesach"],
        "short_explanation": "חג יהודי המציין את יציאת מצרים",
        "short_explanation_en": "Jewish holiday commemorating the Exodus from Egypt",
        "short_explanation_es": "Festividad judía que conmemora el Éxodo de Egipto",
        "relevance_keywords": ["חג", "הגדה", "מצה", "סדר"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "hanukkah",
        "canonical_name": "חנוכה",
        "canonical_name_en": "Hanukkah",
        "category": ReferenceCategory.EVENT,
        "subcategory": "holiday",
        "aliases": ["חג החנוכה", "חג האורים"],
        "aliases_en": ["Chanukah", "Festival of Lights"],
        "short_explanation": "חג יהודי המציין את ניצחון המכבים והדלקת הנרות",
        "short_explanation_en": "Jewish holiday celebrating the Maccabean victory and the miracle of lights",
        "short_explanation_es": "Festividad judía que celebra la victoria macabea y el milagro de las luces",
        "relevance_keywords": ["חג", "נרות", "מכבים", "סביבון"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "purim",
        "canonical_name": "פורים",
        "canonical_name_en": "Purim",
        "category": ReferenceCategory.EVENT,
        "subcategory": "holiday",
        "aliases": ["חג פורים"],
        "aliases_en": ["Festival of Lots"],
        "short_explanation": "חג יהודי המציין את הצלת היהודים בפרס העתיקה",
        "short_explanation_en": "Jewish holiday celebrating the salvation of Jews in ancient Persia",
        "short_explanation_es": "Festividad judía que celebra la salvación de los judíos en la antigua Persia",
        "relevance_keywords": ["חג", "תחפושות", "מגילת אסתר"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "shabbat",
        "canonical_name": "שבת",
        "canonical_name_en": "Shabbat",
        "category": ReferenceCategory.EVENT,
        "subcategory": "holiday",
        "aliases": ["יום השבת", "שבת קודש"],
        "aliases_en": ["Sabbath", "Saturday"],
        "short_explanation": "יום המנוחה השבועי ביהדות, מערב שישי עד מוצאי שבת",
        "short_explanation_en": "Weekly day of rest in Judaism, from Friday evening to Saturday night",
        "short_explanation_es": "Día de descanso semanal en el judaísmo",
        "relevance_keywords": ["מנוחה", "דת", "קידוש"],
        "source": "manual",
        "verified": True,
    },
    # === HISTORICAL EVENTS ===
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
        "short_explanation": "הסכמי שלום בין ישראל לאש\"ף שנחתמו ב-1993",
        "short_explanation_en": "Peace agreements between Israel and PLO signed in 1993",
        "short_explanation_es": "Acuerdos de paz entre Israel y la OLP firmados en 1993",
        "relevance_keywords": ["שלום", "רבין", "ערפאת"],
        "source": "manual",
        "verified": True,
    },
    # === IDF TERMINOLOGY ===
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
    # === HEBREW SLANG ===
    {
        "reference_id": "sababa",
        "canonical_name": "סבבה",
        "canonical_name_en": "Sababa",
        "category": ReferenceCategory.TERM,
        "subcategory": "slang",
        "aliases": ["סבבה גמור", "הכל סבבה"],
        "aliases_en": ["Cool", "Awesome"],
        "short_explanation": "ביטוי עממי לאישור, הסכמה או שמחה",
        "short_explanation_en": "Slang expression meaning cool, okay, or great",
        "short_explanation_es": "Expresión coloquial que significa genial, bien",
        "relevance_keywords": ["סלנג", "עברית"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "achi",
        "canonical_name": "אחי",
        "canonical_name_en": "Achi",
        "category": ReferenceCategory.TERM,
        "subcategory": "slang",
        "aliases": ["אח שלי"],
        "aliases_en": ["Bro", "Brother"],
        "short_explanation": "פנייה לגבר, כמו 'אח שלי' באנגלית",
        "short_explanation_en": "Term of address for a man, like 'bro' in English",
        "short_explanation_es": "Forma de dirigirse a un hombre, como 'hermano'",
        "relevance_keywords": ["סלנג", "עברית"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "yalla",
        "canonical_name": "יאללה",
        "canonical_name_en": "Yalla",
        "category": ReferenceCategory.TERM,
        "subcategory": "slang",
        "aliases": ["יאלה"],
        "aliases_en": ["Let's go", "Come on"],
        "short_explanation": "ביטוי עממי להזרזה או יציאה, מקורו בערבית",
        "short_explanation_en": "Slang for hurry up or let's go, originally from Arabic",
        "short_explanation_es": "Expresión coloquial para apurarse, originalmente del árabe",
        "relevance_keywords": ["סלנג", "עברית", "ערבית"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "balagan",
        "canonical_name": "בלאגן",
        "canonical_name_en": "Balagan",
        "category": ReferenceCategory.TERM,
        "subcategory": "slang",
        "aliases": [],
        "aliases_en": ["Mess", "Chaos"],
        "short_explanation": "ביטוי לאי-סדר או בלבול, מקורו ברוסית",
        "short_explanation_en": "Slang for mess or chaos, originally from Russian",
        "short_explanation_es": "Expresión coloquial para desorden o caos",
        "relevance_keywords": ["סלנג", "עברית"],
        "source": "manual",
        "verified": True,
    },
    {
        "reference_id": "stam",
        "canonical_name": "סתם",
        "canonical_name_en": "Stam",
        "category": ReferenceCategory.TERM,
        "subcategory": "slang",
        "aliases": ["סתם ככה"],
        "aliases_en": ["Just", "No reason"],
        "short_explanation": "ביטוי ל'בלי סיבה מיוחדת' או 'צחוק'",
        "short_explanation_en": "Expression meaning 'just because' or 'kidding'",
        "short_explanation_es": "Expresión que significa 'solo porque sí' o 'en broma'",
        "relevance_keywords": ["סלנג", "עברית"],
        "source": "manual",
        "verified": True,
    },
    # === NOTABLE PLACES ===
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
    # === LEGAL TERMS ===
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
        "canonical_name": "בג\"ץ",
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
    # === CULTURAL FIGURES ===
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


async def seed_cultural_references():
    """Seed the cultural reference knowledge base."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[CulturalReference],
    )

    logger.info("Starting cultural references seeding...")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for ref_data in CULTURAL_REFERENCES:
        reference_id = ref_data["reference_id"]

        # Check if reference already exists
        existing = await CulturalReference.find_one(
            CulturalReference.reference_id == reference_id
        )

        if existing:
            if existing.verified:
                # Don't overwrite verified entries
                logger.debug(f"Skipping verified reference: {reference_id}")
                skipped_count += 1
                continue
            else:
                # Update non-verified entry
                for key, value in ref_data.items():
                    setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
                await existing.save()
                logger.info(f"Updated reference: {reference_id}")
                updated_count += 1
        else:
            # Create new reference
            reference = CulturalReference(
                **ref_data,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            await reference.insert()
            logger.info(f"Created reference: {reference_id}")
            created_count += 1

    # Close connection
    client.close()

    logger.info(
        f"Seeding complete: {created_count} created, {updated_count} updated, "
        f"{skipped_count} skipped (verified)"
    )
    logger.info(f"Total references in database: {created_count + updated_count + skipped_count}")

    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": len(CULTURAL_REFERENCES),
    }


async def main():
    """Main entry point."""
    result = await seed_cultural_references()
    logger.info(f"Result: {result}")


if __name__ == "__main__":
    asyncio.run(main())
