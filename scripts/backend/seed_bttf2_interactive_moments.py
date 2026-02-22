#!/usr/bin/env python3
"""
Seed interactive moments for Back to the Future Part II (1989).

Ten scripted scenes where the child's avatar can interact
with movie characters during playback.

Usage:
    cd backend && poetry run python ../scripts/backend/seed_bttf2_interactive_moments.py
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

BTTF2_IMDB_ID = "tt0096874"

async def _get_voice_id(db, character_name: str, default_voice: str) -> str:
    """Look up voice_id from the characters collection."""
    char = await db.characters.find_one({"name": character_name})
    if char:
        return char["voice_id"]
    logger.warning("No character record for %s, using default", character_name)
    return default_voice


async def build_bttf2_moments(db, default_voice: str) -> list:
    """Build 10 interactive moment documents for BTTF Part II."""
    doc_brown_voice = await _get_voice_id(db, "Doc Brown", default_voice)
    marty_voice = await _get_voice_id(db, "Marty McFly", default_voice)
    biff_voice = await _get_voice_id(db, "Biff Tannen", default_voice)
    jennifer_voice = await _get_voice_id(db, "Jennifer Parker", default_voice)

    doc_brown_face = await db.characters.find_one({"name": "Doc Brown"})
    marty_face = await db.characters.find_one({"name": "Marty McFly"})
    biff_face = await db.characters.find_one({"name": "Biff Tannen"})
    jennifer_face = await db.characters.find_one({"name": "Jennifer Parker"})

    faces = {
        "Doc Brown": doc_brown_face["face_url"] if doc_brown_face else None,
        "Marty McFly": marty_face["face_url"] if marty_face else None,
        "Biff Tannen": biff_face["face_url"] if biff_face else None,
        "Jennifer Parker": jennifer_face["face_url"] if jennifer_face else None,
    }

    return [
        {
            "timestamp": 480.0,
            "duration": 45.0,
            "scene_context": (
                "2015 Hill Valley. Doc Brown and Marty have just arrived in"
                " the DeLorean from 1985. The streets are filled with flying"
                " cars and futuristic billboards. Doc is wearing a silver"
                " outfit and futuristic sunglasses. He urgently tells Marty"
                " they must fix something that happens to his kids in the"
                " future. Doc says: 'Something's gotta be done about your"
                " kids, Marty!'"
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc Brown just arrived in the future!"
                " Ask him what went wrong with Marty's kids."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "What happened to Marty's kids?",
                "Why did we come to the future?",
                "Is the future as cool as it looks?",
            ],
        },
        {
            "timestamp": 900.0,
            "duration": 45.0,
            "scene_context": (
                "Cafe 80s, Hill Valley 2015. Marty walks into the retro"
                " 1980s-themed diner of the future. There are Max Headroom-style"
                " virtual waiters on screens, an automated ordering system, and"
                " kids who don't know how to use the vintage arcade games."
                " Marty is amazed and confused by the futuristic technology."
                " He orders a Pepsi and is handed a weird futuristic bottle."
            ),
            "character_name": "Marty McFly",
            "character_frame_url": faces["Marty McFly"],
            "interaction_prompt": (
                "Marty is exploring the Cafe of the future!"
                " Ask him what it's like."
            ),
            "voice_id": marty_voice,
            "dialogue_options": [
                "What's the coolest thing about the future?",
                "Is the food different in 2015?",
                "Do you miss 1985?",
            ],
        },
        {
            "timestamp": 1200.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley 2015 streets. Doc Brown is explaining the"
                " hoverboard to Marty after the chase scene with Griff's"
                " gang. The pink hoverboard floats in the air. Doc is"
                " animated and excited but also worried because things"
                " have started to go wrong. He explains how the future"
                " timeline is fragile and why they need to be careful"
                " about changing events."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc Brown has a hoverboard!"
                " Ask him how it works."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How does the hoverboard fly?",
                "Why can't it go over water?",
                "Can I try the hoverboard?",
            ],
        },
        {
            "timestamp": 1500.0,
            "duration": 45.0,
            "scene_context": (
                "Future McFly home, 2015. Jennifer Parker has been left"
                " unconscious by Doc and brought to the McFly household"
                " by police. She wakes up inside her future home and sees"
                " older versions of herself and Marty. The house has voice"
                " activated appliances, a flat screen TV with multiple"
                " channels, and the family dynamics are strained. She is"
                " confused and emotional seeing what her future holds."
            ),
            "character_name": "Jennifer Parker",
            "character_frame_url": faces["Jennifer Parker"],
            "interaction_prompt": (
                "Jennifer just saw her future!"
                " Ask her what she thinks."
            ),
            "voice_id": jennifer_voice,
            "dialogue_options": [
                "What was it like seeing the future you?",
                "Is your future house cool?",
                "Are you worried about the future?",
            ],
        },
        {
            "timestamp": 1800.0,
            "duration": 45.0,
            "scene_context": (
                "2015 Hill Valley. Old Biff Tannen, now elderly and using"
                " a cane, has overheard Doc and Marty talking about time"
                " travel. He sneaks into the DeLorean while they're"
                " distracted and steals the Grays Sports Almanac from"
                " the car. Old Biff has a devious plan to give the almanac"
                " to his younger self in 1955 so he can become rich."
                " He takes the DeLorean on a joyride through time."
            ),
            "character_name": "Biff Tannen",
            "character_frame_url": faces["Biff Tannen"],
            "interaction_prompt": (
                "Old Biff stole the DeLorean!"
                " Ask him what he's up to."
            ),
            "voice_id": biff_voice,
            "dialogue_options": [
                "Why did you steal the time machine?",
                "What's so special about that book?",
                "Aren't you worried about changing history?",
            ],
        },
        {
            "timestamp": 3000.0,
            "duration": 45.0,
            "scene_context": (
                "Alternate 1985 Hill Valley. Doc and Marty have returned"
                " to 1985 but everything has changed. Biff is now a"
                " powerful corrupt billionaire who owns a casino empire"
                " called Pleasure Paradise. The town is run-down and"
                " dangerous. Doc has figured out that old Biff gave the"
                " sports almanac to his younger self in 1955, creating"
                " this nightmarish alternate timeline. Doc explains the"
                " branching timeline theory with a chalkboard diagram."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc Brown is explaining how the timeline got messed up!"
                " Ask him how to fix it."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How did Biff change the whole timeline?",
                "Can we fix things and make it right?",
                "What happens if we can't get the almanac back?",
            ],
        },
        {
            "timestamp": 3600.0,
            "duration": 45.0,
            "scene_context": (
                "Biff's Pleasure Paradise casino, alternate 1985."
                " Biff Tannen is now the richest and most powerful man"
                " in Hill Valley. He sits in his luxurious penthouse"
                " suite at the top of his casino tower. He's wearing"
                " an expensive suit and smoking a cigar. Biff has used"
                " the sports almanac to bet on every sporting event"
                " since 1958 and has never lost. He's arrogant and"
                " menacing, reveling in his ill-gotten wealth."
            ),
            "character_name": "Biff Tannen",
            "character_frame_url": faces["Biff Tannen"],
            "interaction_prompt": (
                "Rich Biff is bragging about his casino!"
                " Ask him how he got so rich."
            ),
            "voice_id": biff_voice,
            "dialogue_options": [
                "How did you get so rich?",
                "Did you really win every bet?",
                "Don't you feel bad about cheating?",
            ],
        },
        {
            "timestamp": 4500.0,
            "duration": 45.0,
            "scene_context": (
                "Doc's lab, alternate 1985. Doc Brown has worked out the"
                " exact date and time when old Biff gave young Biff the"
                " sports almanac: November 12, 1955. That was the night"
                " of the Enchantment Under the Sea dance, the same night"
                " Marty was already in 1955 during the first movie."
                " Doc is urgent and determined. They must go back to"
                " 1955 again and get the almanac before young Biff uses"
                " it to change history."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc figured out when to go!"
                " Ask him about the plan."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "Why do we have to go back to 1955 again?",
                "How will you find the almanac?",
                "Won't past-Marty see us?",
            ],
        },
        {
            "timestamp": 5400.0,
            "duration": 45.0,
            "scene_context": (
                "Hill Valley High School, 1955. The Enchantment Under the"
                " Sea dance is happening again, but this time Marty must"
                " avoid his past self while trying to steal the sports"
                " almanac from Biff. The school gym is decorated with"
                " streamers and a starry night theme. Marty can hear"
                " the music playing inside. He's sneaking around outside"
                " trying to locate Biff and the almanac without being"
                " spotted by anyone who already knows him."
            ),
            "character_name": "Marty McFly",
            "character_frame_url": faces["Marty McFly"],
            "interaction_prompt": (
                "Marty is sneaking around the 1955 dance!"
                " Ask him how the mission is going."
            ),
            "voice_id": marty_voice,
            "dialogue_options": [
                "How will you get the almanac from Biff?",
                "Is it weird being in 1955 again?",
                "What happens if past-you sees you?",
            ],
        },
        {
            "timestamp": 6300.0,
            "duration": 50.0,
            "scene_context": (
                "Hill Valley 1955, just outside the Courthouse. The"
                " DeLorean is hovering in the air with Doc Brown at"
                " the controls. A bolt of lightning strikes the DeLorean"
                " and it vanishes in a flash of light. Doc has been"
                " accidentally sent back to 1885. Marty is left stranded"
                " in 1955, alone in the rain. A Western Union delivery"
                " man arrives with a letter from Doc dated 1885. Doc"
                " is alive in the Old West and has left instructions."
                " This sets up the journey to Part III."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc got sent to 1885!"
                " Read his letter and ask him about the Old West."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How did you end up in 1885?",
                "Are you okay in the Old West?",
                "How will Marty come find you?",
            ],
        },
    ]


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF2_IMDB_ID})
    if not content:
        logger.error(
            "Back to the Future Part II not found (imdb_id=%s)",
            BTTF2_IMDB_ID,
        )
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    logger.info(
        "Found Back to the Future Part II: content_id=%s, title=%s",
        content_id,
        content.get("title"),
    )

    moments = await build_bttf2_moments(db, settings.CHARACTER_VOICE_DEFAULT)

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
            "Seeded %d interactive moments for BTTF Part II",
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
