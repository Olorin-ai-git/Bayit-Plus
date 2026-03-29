"""
Generate multi-language hero demo clips for olorin.ai homepage.

Produces 27 lip-sync videos (3 questions × 9 non-English languages)
using Walter Burns' cloned voice via ElevenLabs eleven_multilingual_v2.

English clips already exist. This generates the remaining 9 languages.

Usage:
    cd backend
    poetry run python -m app.scripts.generate_hero_demo_clips [--dry-run]
"""

import asyncio
import json
import logging
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.vod_interaction.character_animator import CharacterAnimatorService

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CONTENT_ID = "69c7d02add558ecad90e4e89"
CHARACTER_NAME = "Walter Burns"

# Per-language voice overrides (native speakers instead of Walter's clone)
VOICE_OVERRIDES: dict[str, str] = {
    "he": "FQWIpe4YnbYrq9cljgra",  # Nissan — native Hebrew speaker
}

# Existing English clip URLs (already on CDN)
EN_CLIPS = {
    "q1": "https://cdn.bayit.tv/vod-interactions/aurora-lipsync/4aecb325df1f.mp4",
    "q2": "https://cdn.bayit.tv/vod-interactions/aurora-lipsync/980663ceb2ae.mp4",
    "q3": "https://cdn.bayit.tv/vod-interactions/aurora-lipsync/3d31262f1a06.mp4",
}

# Response texts per language (matching portal-main i18n locale files)
RESPONSES: dict[str, dict[str, str]] = {
    "he": {
        "q1": "תשמע, אהבה זה דבר מסובך. יש אנשים שאתה פשוט לא יכול לוותר עליהם, לא משנה מה. הילדי היא כזאת. מה אני יכול לעשות?",
        "q2": "לשחרר אותה? תגיד, אתה מכיר אותי בכלל? אני לא מוותר ככה בקלות. כשמשהו חשוב לך באמת, אתה נלחם עליו עד הסוף.",
        "q3": "הכל תכסיס אצלי, ככה אני בנוי. אבל כשזה מגיע להילדי, זה משהו אחר לגמרי. יש תכסיסים ויש תכסיסים, מבין?",
    },
    "es": {
        "q1": "Bueno chico, esa es una pregunta bastante madura! El amor es un asunto complicado - a veces quieres tanto a alguien que harías casi cualquier cosa para mantenerlo cerca.",
        "q2": "Escucha chico, dejar ir a alguien no siempre se trata de lo que es mejor para ellos - a veces tienes que luchar por lo que más importa.",
        "q3": "Escucha chico, todo lo que hago es un plan - eso es lo que hace la vida interesante! Pero cuando se trata de Hildy, algunos planes valen más que otros.",
    },
    "zh": {
        "q1": "嗯小子，这可是个很成熟的问题！爱情是个复杂的事情——有时候你太在乎一个人，愿意做几乎任何事来留住他们。",
        "q2": "听着小子，放手不总是为了对方好——有时候你必须为最重要的东西而战。",
        "q3": "听着小子，我做的一切都是阴谋——这就是生活有趣的地方！但说到希尔迪，有些阴谋比其他的更值得。",
    },
    "fr": {
        "q1": "Eh bien gamin, c'est une question plutôt adulte ! L'amour c'est une affaire compliquée - parfois on tient tellement à quelqu'un qu'on ferait n'importe quoi pour le garder près de soi.",
        "q2": "Écoute gamin, laisser partir quelqu'un n'est pas toujours une question de ce qui est mieux pour eux - parfois il faut se battre pour ce qui compte vraiment.",
        "q3": "Écoute gamin, tout ce que je fais est un stratagème - c'est ça qui rend la vie intéressante ! Mais quand il s'agit de Hildy, certains stratagèmes valent plus que d'autres.",
    },
    "it": {
        "q1": "Beh ragazzo, questa è una domanda piuttosto matura! L'amore è un affare complicato - a volte ci tieni così tanto a qualcuno che faresti qualsiasi cosa per tenerlo vicino.",
        "q2": "Ascolta ragazzo, lasciar andare qualcuno non è sempre questione di cosa sia meglio per loro - a volte devi combattere per ciò che conta di più.",
        "q3": "Ascolta ragazzo, tutto quello che faccio è un piano - è questo che rende la vita interessante! Ma quando si tratta di Hildy, certi piani valgono più di altri.",
    },
    "hi": {
        "q1": "अरे बच्चे, यह तो काफी बड़ा सवाल है! प्यार एक जटिल मामला है - कभी-कभी तुम किसी की इतनी परवाह करते हो कि उन्हें पास रखने के लिए कुछ भी कर सकते हो।",
        "q2": "सुनो बच्चे, किसी को जाने देना हमेशा उनके लिए सबसे अच्छा नहीं होता - कभी-कभी तुम्हें सबसे महत्वपूर्ण चीज़ के लिए लड़ना होता है।",
        "q3": "सुनो बच्चे, मैं जो कुछ भी करता हूँ वो एक योजना है - यही तो ज़िंदगी को दिलचस्प बनाता है! लेकिन जब हिल्डी की बात आती है, कुछ योजनाएँ दूसरों से ज़्यादा कीमती हैं।",
    },
    "ta": {
        "q1": "சரி குழந்தை, இது மிகவும் முதிர்ச்சியான கேள்வி! காதல் ஒரு சிக்கலான விஷயம் - சில நேரங்களில் யாரையாவது மிகவும் நேசிக்கும்போது அவர்களை அருகில் வைக்க எதையும் செய்வாய்.",
        "q2": "கேளு குழந்தை, யாரையாவது விட்டுவிடுவது எப்போதும் அவர்களுக்கு நல்லது என்பது இல்லை - சில நேரங்களில் மிக முக்கியமானதற்காக போராட வேண்டும்.",
        "q3": "கேளு குழந்தை, நான் செய்வதெல்லாம் ஒரு திட்டம் - அதுதான் வாழ்க்கையை சுவாரஸ்யமாக்குகிறது! ஆனால் ஹில்டியைப் பொறுத்தவரை, சில திட்டங்கள் மற்றவற்றை விட மதிப்புள்ளவை.",
    },
    "bn": {
        "q1": "আরে বাচ্চা, এটা বেশ পরিপক্ব প্রশ্ন! ভালোবাসা একটা জটিল ব্যাপার - কখনও কখনও তুমি কাউকে এতটা ভালোবাসো যে তাকে কাছে রাখতে যেকোনো কিছু করবে।",
        "q2": "শোনো বাচ্চা, কাউকে ছেড়ে দেওয়া সবসময় তাদের জন্য ভালো নয় - কখনও কখনও সবচেয়ে গুরুত্বপূর্ণ জিনিসের জন্য লড়াই করতে হয়।",
        "q3": "শোনো বাচ্চা, আমি যা কিছু করি সবই পরিকল্পনা - এটাই জীবনকে মজাদার করে! কিন্তু হিল্ডির ব্যাপারে, কিছু পরিকল্পনা অন্যগুলোর চেয়ে বেশি মূল্যবান।",
    },
    "ja": {
        "q1": "おい坊や、なかなか大人な質問だな！愛ってのは複雑なもんでね - 時には誰かをそばに置いておくために何でもやっちまうもんさ。",
        "q2": "聞けよ坊や、誰かを手放すってのは必ずしもその人のためじゃない - 時には一番大切なもののために戦わなきゃならないのさ。",
        "q3": "聞けよ坊や、俺のやることは全部策略さ - それが人生を面白くするんだ！だがヒルディのことになると、他より価値のある策略ってもんがあるのさ。",
    },
}


async def run(dry_run: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(
        settings, "MONGODB_URL", None
    )
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(
        database=db,
        document_models=[Content, SubtitleTrackDoc],
        skip_indexes=True,
    )

    content = await Content.get(CONTENT_ID)
    if not content:
        logger.error("Content %s not found", CONTENT_ID)
        return

    char_map = {c.name: c for c in (content.interactive_characters or [])}
    walter = char_map.get(CHARACTER_NAME)
    if not walter:
        logger.error("Character '%s' not found", CHARACTER_NAME)
        return

    voice_id = walter.voice_id or ""
    frame_url = walter.frame_url or ""
    logger.info("Walter Burns voice_id=%s frame_url=%s", voice_id, frame_url[:60])

    if not voice_id or not frame_url:
        logger.error("Missing voice_id or frame_url for Walter Burns")
        return

    animator = CharacterAnimatorService()
    clips: dict[str, dict[str, str]] = {"en": EN_CLIPS}

    skip_langs = set()
    for arg in sys.argv[1:]:
        if arg.startswith("--skip="):
            skip_langs = set(arg.split("=", 1)[1].split(","))

    for lang, responses in RESPONSES.items():
        if lang in skip_langs:
            logger.info("=== Skipping %s (already generated) ===", lang)
            continue
        logger.info("=== Language: %s ===", lang)
        lang_clips: dict[str, str] = {}

        for q_key, response_text in responses.items():
            logger.info("  %s: %s...", q_key, response_text[:50])

            if dry_run:
                lang_clips[q_key] = f"https://cdn.bayit.tv/vod-interactions/aurora-lipsync/{lang}_{q_key}_dry_run.mp4"
                continue

            video_url = ""
            for attempt in range(3):
                try:
                    lang_voice = VOICE_OVERRIDES.get(lang, voice_id)
                    animated = await animator.animate_character_response(
                        character_name=CHARACTER_NAME,
                        dialogue_text=response_text,
                        character_frame_url=frame_url,
                        voice_id=lang_voice,
                    )
                    video_url = animated.video_url or ""
                    break
                except Exception as e:
                    logger.warning(
                        "    Attempt %d failed: %s", attempt + 1, str(e)[:100]
                    )
                    if attempt < 2:
                        await asyncio.sleep(5)

            logger.info("    Video: %s", video_url[:80] if video_url else "NONE")
            lang_clips[q_key] = video_url

        clips[lang] = lang_clips
        logger.info("  Completed %s: %d clips", lang, len(lang_clips))

    # Output the final CLIPS config for the frontend component
    logger.info("\n=== CLIPS CONFIG (paste into HeroTerminalDemo.tsx) ===")
    print(json.dumps(clips, indent=2, ensure_ascii=False))

    total = sum(len(v) for v in clips.values())
    logger.info("Done: %d total clips across %d languages", total, len(clips))


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
