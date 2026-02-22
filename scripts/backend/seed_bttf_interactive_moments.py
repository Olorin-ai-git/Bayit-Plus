#!/usr/bin/env python3
"""
Seed interactive moments for Back to the Future (1985).

Ten scripted scenes where the child's avatar can interact
with movie characters during playback.

Usage:
    cd backend && poetry run python ../scripts/backend/seed_bttf_interactive_moments.py
"""

import asyncio
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF_IMDB_ID = "tt0088763"

CHARACTER_NAMES = [
    "Doc Brown",
    "George McFly",
    "Marty McFly",
    "Jennifer Parker",
    "Lorraine Baines",
    "Biff Tannen",
]


async def _get_voice_id(db, character_name: str, default_voice: str) -> str:
    """Look up voice_id from the characters collection."""
    char = await db.characters.find_one({"name": character_name})
    if char:
        return char["voice_id"]
    logger.warning("No character record for %s, using default", character_name)
    return default_voice


async def _load_characters(db, default_voice: str) -> tuple[dict, dict]:
    """Load voice IDs and face URLs for all BTTF characters."""
    voices = {}
    faces = {}
    for name in CHARACTER_NAMES:
        char = await db.characters.find_one({"name": name})
        if char:
            voices[name] = char["voice_id"]
            faces[name] = char.get("face_url")
        else:
            logger.warning("No character record for %s", name)
            voices[name] = default_voice
            faces[name] = None
    return voices, faces


async def build_bttf_moments(db, default_voice: str) -> list:
    """Build 10 interactive moment documents for BTTF."""
    voices, faces = await _load_characters(db, default_voice)

    return [
        {
            "timestamp": 300.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley High School parking lot, daytime. Jennifer"
                " Parker is leaning against Marty's truck, waiting for"
                " him after school. Marty just got rejected at the Battle"
                " of the Bands audition. He is discouraged and says his"
                " music dreams might be pointless. Jennifer takes his"
                " hand and encourages him not to give up. She believes"
                " in him more than he believes in himself. The parking"
                " lot is busy with students heading home."
            ),
            "character_name": "Jennifer Parker",
            "character_frame_url": faces["Jennifer Parker"],
            "interaction_prompt": (
                "Jennifer is cheering Marty up after a tough day!"
                " Talk to her about following your dreams."
            ),
            "voice_id": voices["Jennifer Parker"],
            "dialogue_options": [
                "Should you keep trying even when things are hard?",
                "What do you like most about Marty?",
                "Do you think Marty's band will make it?",
            ],
        },
        {
            "timestamp": 1080.0,
            "duration": 45.0,
            "scene_context": (
                "Twin Pines Mall parking lot, 1:15 AM. Doc Brown has"
                " just unveiled the DeLorean time machine to Marty."
                " The flux capacitor glows inside the stainless steel"
                " body. Einstein the dog has just completed the first"
                " temporal displacement, vanishing in a flash of light"
                " and reappearing one minute later. Doc is ecstatic,"
                " jumping around and explaining how he came up with the"
                " idea after hitting his head on the sink. He says:"
                " 'If my calculations are correct, when this baby hits"
                " 88 miles per hour, you're gonna see some serious...'"
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc Brown wants to show you his time machine!"
                " Ask him how it works."
            ),
            "voice_id": voices["Doc Brown"],
            "dialogue_options": [
                "How does the time machine work?",
                "Can I travel to the future?",
                "What's the flux capacitor?",
            ],
        },
        {
            "timestamp": 1680.0,
            "duration": 45.0,
            "scene_context": (
                "McFly family home, Hill Valley 1955. Young Lorraine"
                " Baines sits at the dinner table across from Marty,"
                " who she knows only as Calvin Klein because of the"
                " name on his underwear. Lorraine's parents and siblings"
                " are around the table. She gazes at Marty dreamily,"
                " completely smitten. Lorraine's father is ranting about"
                " the television set. The house has a warm 1950s family"
                " atmosphere with checkered curtains and pot roast."
            ),
            "character_name": "Lorraine Baines",
            "character_frame_url": faces["Lorraine Baines"],
            "interaction_prompt": (
                "Young Lorraine is having dinner with her family!"
                " Ask her about life in the 1950s."
            ),
            "voice_id": voices["Lorraine Baines"],
            "dialogue_options": [
                "What's your favorite thing about the 1950s?",
                "What do you want to be when you grow up?",
                "Do you like going to school dances?",
            ],
        },
        {
            "timestamp": 2100.0,
            "duration": 45.0,
            "scene_context": (
                "Doc Brown's mansion, Hill Valley 1955. Marty has just"
                " proven to Doc that he is from the future by telling"
                " him about the flux capacitor. Doc is overwhelmed with"
                " excitement, pacing around his cluttered laboratory"
                " filled with clocks and inventions. He keeps saying"
                " 'Great Scott!' and examining the DeLorean in disbelief."
                " Doc realizes this means his life's work will actually"
                " succeed. He grabs Marty by the shoulders and asks a"
                " dozen questions about the future all at once."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc just found out time travel really works!"
                " Ask him what he wants to know about the future."
            ),
            "voice_id": voices["Doc Brown"],
            "dialogue_options": [
                "What's the most exciting part about time travel?",
                "What would you do if you could visit any time?",
                "Are you surprised it actually works?",
            ],
        },
        {
            "timestamp": 2670.0,
            "duration": 40.0,
            "scene_context": (
                "Lou's Cafe, Hill Valley 1955. George McFly sits at the"
                " counter trying to write science fiction stories in his"
                " notebook. Biff Tannen has just left after bullying"
                " George and copying his homework. George looks defeated"
                " and nervous. He tells Marty he's worried about"
                " rejection and doesn't think his stories are any good."
                " The cafe has a 1950s soda fountain atmosphere with a"
                " jukebox playing in the background."
            ),
            "character_name": "George McFly",
            "character_frame_url": faces["George McFly"],
            "interaction_prompt": (
                "George McFly looks like he could use some"
                " encouragement. Talk to him!"
            ),
            "voice_id": voices["George McFly"],
            "dialogue_options": [
                "Your stories sound really cool!",
                "Don't let Biff get you down.",
                "You should ask Lorraine to the dance!",
            ],
        },
        {
            "timestamp": 3120.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley town square, 1955. Biff Tannen and his"
                " gang have just cornered Marty after a confrontation."
                " Marty grabbed a makeshift skateboard and Biff chased"
                " him in his car through the town square. The chase"
                " ended with Biff crashing his car into a manure truck,"
                " getting covered in manure while the whole town watches"
                " and laughs. Biff is furious, wiping manure off his"
                " face, and swearing revenge."
            ),
            "character_name": "Biff Tannen",
            "character_frame_url": faces["Biff Tannen"],
            "interaction_prompt": (
                "Biff just crashed into a manure truck!"
                " Ask him how that happened."
            ),
            "voice_id": voices["Biff Tannen"],
            "dialogue_options": [
                "How did you end up in the manure?",
                "Why do you always pick on people?",
                "Maybe you should be nicer to others!",
            ],
        },
        {
            "timestamp": 3900.0,
            "duration": 45.0,
            "scene_context": (
                "Doc Brown's mansion, 1955. Doc and Marty stand over a"
                " tabletop model of the Hill Valley courthouse and clock"
                " tower. Doc is excitedly explaining his plan to channel"
                " a bolt of lightning from the clock tower into the flux"
                " capacitor to send Marty back to 1985. He has a detailed"
                " scale model with a toy DeLorean and string representing"
                " the cable. Doc calculates the exact time the lightning"
                " will strike: 10:04 PM on November 12. He is animated"
                " and precise, waving his arms as he describes each step."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc has a plan to send Marty home using lightning!"
                " Ask him how it works."
            ),
            "voice_id": voices["Doc Brown"],
            "dialogue_options": [
                "How will lightning send Marty back?",
                "What if something goes wrong?",
                "How do you know when the lightning will strike?",
            ],
        },
        {
            "timestamp": 4500.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley High School gymnasium, 1955. The Enchantment"
                " Under the Sea dance is in full swing. George McFly"
                " stands outside the gym doors, terrified but determined."
                " Marty has convinced him that he must walk in, cut in on"
                " Lorraine's dance partner, and kiss her to make sure"
                " they fall in love. George rehearses what he'll say,"
                " straightening his suit nervously. Inside, the band is"
                " playing and students are dancing under paper stars."
                " This is the moment that decides Marty's entire existence."
            ),
            "character_name": "George McFly",
            "character_frame_url": faces["George McFly"],
            "interaction_prompt": (
                "George needs courage for the big moment!"
                " Give him a pep talk."
            ),
            "voice_id": voices["George McFly"],
            "dialogue_options": [
                "You can do it, George! Just be yourself!",
                "What are you going to say to Lorraine?",
                "Are you nervous about the dance?",
            ],
        },
        {
            "timestamp": 5100.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley High School stage, 1955. Marty McFly has"
                " just finished playing Johnny B. Goode with the"
                " Starlighters band. The crowd of 1955 teenagers stares"
                " in stunned silence at first, then erupts in applause."
                " Marty got carried away with a wild guitar solo that"
                " was decades ahead of its time. He stands on stage"
                " catching his breath, guitar in hand, grinning at the"
                " crowd's reaction. The band members look bewildered."
                " Marty says to the audience: 'I guess you guys aren't"
                " ready for that yet. But your kids are gonna love it.'"
            ),
            "character_name": "Marty McFly",
            "character_frame_url": faces["Marty McFly"],
            "interaction_prompt": (
                "Marty just rocked the stage!"
                " Ask him about playing Johnny B. Goode."
            ),
            "voice_id": voices["Marty McFly"],
            "dialogue_options": [
                "That guitar solo was amazing!",
                "Do you play in a band back home?",
                "What's your favorite kind of music?",
            ],
        },
        {
            "timestamp": 6360.0,
            "duration": 50.0,
            "scene_context": (
                "Hill Valley Courthouse, just after the lightning strike"
                " has sent Marty back to 1985. Doc Brown reads the letter"
                " Marty wrote warning him about the future. The DeLorean"
                " has vanished in a trail of fire. Doc looks at the camera"
                " with a mix of wonder and wisdom. He says: 'Roads? Where"
                " we're going, we don't need roads.' This is the final"
                " scene. Doc is reflective and philosophical about the"
                " nature of time and destiny."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc Brown has a message about your future."
                " What would you like to ask him?"
            ),
            "voice_id": voices["Doc Brown"],
            "dialogue_options": [
                "What does my future look like?",
                "Will we meet again?",
                "What's the most important thing about time?",
            ],
        },
    ]


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error(
            "Back to the Future not found in database (imdb_id=%s)",
            BTTF_IMDB_ID,
        )
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    logger.info(
        "Found Back to the Future: content_id=%s, title=%s",
        content_id,
        content.get("title"),
    )

    moments = await build_bttf_moments(db, settings.CHARACTER_VOICE_DEFAULT)

    result = await db.content.update_one(
        {"_id": content["_id"]},
        {
            "$set": {
                "interactive_moments": moments,
                "supports_avatar_interaction": True,
            }
        },
    )

    if result.modified_count == 1:
        logger.info(
            "Seeded %d interactive moments for Back to the Future",
            len(moments),
        )
        for i, m in enumerate(moments):
            logger.info(
                "  Scene %d: %s at %.0fs (%s)",
                i,
                m["character_name"],
                m["timestamp"],
                m["interaction_prompt"][:50],
            )
    else:
        logger.warning(
            "Update matched but did not modify (moments may already exist)"
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
