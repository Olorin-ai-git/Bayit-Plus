#!/usr/bin/env python3
"""
Seed interactive moments for Back to the Future Part III (1990).

Ten scripted scenes where the child's avatar can interact
with movie characters during playback.

Usage:
    cd backend && poetry run python ../scripts/backend/seed_bttf3_interactive_moments.py
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

BTTF3_IMDB_ID = "tt0099088"

async def _get_voice_id(db, character_name: str, default_voice: str) -> str:
    """Look up voice_id from the characters collection."""
    char = await db.characters.find_one({"name": character_name})
    if char:
        return char["voice_id"]
    logger.warning("No character record for %s, using default", character_name)
    return default_voice


async def build_bttf3_moments(db, default_voice: str) -> list:
    """Build 10 interactive moment documents for BTTF Part III."""
    doc_brown_voice = await _get_voice_id(db, "Doc Brown", default_voice)
    marty_voice = await _get_voice_id(db, "Marty McFly", default_voice)
    biff_voice = await _get_voice_id(db, "Biff Tannen", default_voice)

    doc_brown_face = await db.characters.find_one({"name": "Doc Brown"})
    marty_face = await db.characters.find_one({"name": "Marty McFly"})
    biff_face = await db.characters.find_one({"name": "Biff Tannen"})

    faces = {
        "Doc Brown": doc_brown_face["face_url"] if doc_brown_face else None,
        "Marty McFly": marty_face["face_url"] if marty_face else None,
        "Biff Tannen": biff_face["face_url"] if biff_face else None,
    }

    return [
        {
            "timestamp": 360.0,
            "duration": 45.0,
            "scene_context": (
                "1955 Hill Valley. Doc Brown from 1955 is helping Marty"
                " after receiving the letter from his future self stuck"
                " in 1885. They've found the DeLorean hidden in the"
                " Delgado Mine where 1885 Doc sealed it up for 70 years."
                " The DeLorean is dusty and covered in cobwebs but"
                " intact. Doc is excited and methodical as they work"
                " to repair it and get it running again so Marty can"
                " travel back to 1885 to rescue future Doc."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc found the DeLorean in the mine!"
                " Ask him about the rescue plan."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How did the DeLorean survive 70 years?",
                "How will Marty rescue you from 1885?",
                "What's the Old West like?",
            ],
        },
        {
            "timestamp": 900.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley desert. Marty has just arrived in"
                " the Old West and is immediately chased by Native"
                " Americans on horseback after the DeLorean crashes."
                " He falls unconscious and wakes up at the McFly"
                " family farm. His great-great-grandparents Seamus"
                " and Maggie McFly have rescued him. Marty is amazed"
                " to meet his ancestors and has to pretend to be a"
                " distant relative named Clint Eastwood."
            ),
            "character_name": "Marty McFly",
            "character_frame_url": faces["Marty McFly"],
            "interaction_prompt": (
                "Marty just arrived in the Wild West!"
                " Ask him what it's like."
            ),
            "voice_id": marty_voice,
            "dialogue_options": [
                "What's the Old West really like?",
                "Did you meet your ancestors?",
                "Are cowboys as cool as in the movies?",
            ],
        },
        {
            "timestamp": 1500.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley town. Doc Brown has been living in"
                " the Old West for several months and has become the"
                " town's beloved blacksmith and inventor. His shop"
                " is full of clever 1880s inventions powered by steam"
                " and clockwork. He's made ice using a solar-powered"
                " refrigeration device. Doc seems genuinely happy and"
                " at peace in this simpler time, building things with"
                " his hands. He greets Marty warmly."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc is the town blacksmith!"
                " Ask him about life in the Old West."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "Do you like living in the Old West?",
                "What cool things have you invented?",
                "Do you miss the future?",
            ],
        },
        {
            "timestamp": 2100.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley saloon. Buford 'Mad Dog' Tannen,"
                " Biff's ancestor, storms into town looking for Doc"
                " Brown. Mad Dog is a dangerous outlaw with a bad"
                " temper who claims Doc owes him eighty dollars for"
                " a horse that threw a shoe. He's threatening to shoot"
                " Doc if he doesn't pay up. Mad Dog has a gang of"
                " rough cowboys backing him up. The whole town is"
                " scared of him."
            ),
            "character_name": "Biff Tannen",
            "character_frame_url": faces["Biff Tannen"],
            "interaction_prompt": (
                "Mad Dog Tannen is causing trouble!"
                " Ask him why he's so angry."
            ),
            "voice_id": biff_voice,
            "dialogue_options": [
                "Why are you so mad at Doc Brown?",
                "Why do they call you Mad Dog?",
                "Eighty dollars doesn't seem like that much!",
            ],
        },
        {
            "timestamp": 2700.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley train station. Doc Brown has come to"
                " pick up supplies and meets Clara Clayton, a beautiful"
                " schoolteacher who just arrived by train. She's been"
                " hired to teach at the new schoolhouse. Their eyes"
                " meet and there's an instant spark. Doc helps her"
                " with her luggage and they discover they both love"
                " Jules Verne novels. Doc is smitten and tongue-tied,"
                " which is unusual for the normally eloquent scientist."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc just met someone special!"
                " Ask him about Clara."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "Who is Clara? Do you like her?",
                "Does she like science like you do?",
                "Are you going to take her on a date?",
            ],
        },
        {
            "timestamp": 3300.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley saloon. Marty has just been called"
                " 'chicken' by Mad Dog Tannen's gang. In the past,"
                " Marty always lost his temper when someone called him"
                " that. But this time, he's starting to realize that"
                " he doesn't have to prove himself to bullies. He"
                " stands at the bar thinking about how his hot temper"
                " has gotten him in trouble throughout the trilogy."
                " This is Marty's moment of personal growth."
            ),
            "character_name": "Marty McFly",
            "character_frame_url": faces["Marty McFly"],
            "interaction_prompt": (
                "Marty is learning an important lesson!"
                " Talk to him about being brave."
            ),
            "voice_id": marty_voice,
            "dialogue_options": [
                "Why do you get so mad when people call you chicken?",
                "Do you think being brave means fighting?",
                "What would you tell someone who gets bullied?",
            ],
        },
        {
            "timestamp": 3900.0,
            "duration": 45.0,
            "scene_context": (
                "Doc's blacksmith shop, 1885 evening. Doc Brown sits"
                " alone looking heartbroken. He has realized that he's"
                " fallen deeply in love with Clara Clayton, but he and"
                " Marty must leave 1885 the next morning using the"
                " locomotive plan to push the DeLorean to 88 mph."
                " If he stays, he changes history. If he goes, he"
                " loses Clara forever. Doc is torn between his heart"
                " and his scientific duty to preserve the timeline."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc is sad about leaving Clara."
                " Ask him what he's going to do."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "Are you going to miss Clara?",
                "Can't you bring Clara to the future?",
                "What's more important, love or science?",
            ],
        },
        {
            "timestamp": 4500.0,
            "duration": 45.0,
            "scene_context": (
                "1885 Hill Valley town square, high noon. Buford 'Mad Dog'"
                " Tannen has challenged Marty to a showdown. The whole"
                " town has gathered to watch. Mad Dog stands at one end"
                " of the dusty street with his hand on his holster."
                " Marty must face him alone. The clock tower looms in"
                " the background. Marty has a plan using a stove door"
                " as makeshift body armor under his poncho, inspired"
                " by a Clint Eastwood movie."
            ),
            "character_name": "Biff Tannen",
            "character_frame_url": faces["Biff Tannen"],
            "interaction_prompt": (
                "It's showdown time with Mad Dog!"
                " Ask him if he thinks he'll win."
            ),
            "voice_id": biff_voice,
            "dialogue_options": [
                "Do you really think you can beat Marty?",
                "Isn't there a better way than fighting?",
                "Why do Tannens always want to fight?",
            ],
        },
        {
            "timestamp": 5100.0,
            "duration": 45.0,
            "scene_context": (
                "1885 railroad tracks outside Hill Valley. Doc Brown"
                " has hatched an ingenious plan to get the DeLorean"
                " up to 88 mph using a steam locomotive. They've"
                " loaded special fuel logs that will boost the train's"
                " speed through green, yellow, and red zones. The"
                " DeLorean sits on the tracks ahead of the locomotive."
                " Doc is explaining the plan with his usual enthusiasm,"
                " pointing at a model and timing everything precisely."
                " The track ends at Clayton Ravine, so they must hit"
                " 88 mph before running out of track."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc has a wild plan with a train!"
                " Ask him how it works."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How will a train push the DeLorean?",
                "What if you don't reach 88 mph in time?",
                "Isn't this really dangerous?",
            ],
        },
        {
            "timestamp": 6000.0,
            "duration": 50.0,
            "scene_context": (
                "1985 Hill Valley railroad crossing. Marty has just"
                " returned from 1885 and the DeLorean is destroyed"
                " by an oncoming train. Marty thinks Doc is stuck in"
                " 1885 forever. Then suddenly, a massive steam-powered"
                " time-traveling locomotive appears out of thin air"
                " on the tracks. Doc Brown emerges wearing a cowboy"
                " hat, with Clara Clayton and their two sons Jules"
                " and Verne. Doc built a new time machine from a"
                " locomotive. He tells Marty: 'Your future hasn't"
                " been written yet. No one's has. So make it a good"
                " one.'"
            ),
            "character_name": "Doc Brown",
            "character_frame_url": faces["Doc Brown"],
            "interaction_prompt": (
                "Doc came back with a time-traveling train!"
                " Ask him about the future."
            ),
            "voice_id": doc_brown_voice,
            "dialogue_options": [
                "How did you build a time train?",
                "Did you and Clara stay together?",
                "What's the most important thing about the future?",
            ],
        },
    ]


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF3_IMDB_ID})
    if not content:
        logger.error(
            "Back to the Future Part III not found (imdb_id=%s)",
            BTTF3_IMDB_ID,
        )
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    logger.info(
        "Found Back to the Future Part III: content_id=%s, title=%s",
        content_id,
        content.get("title"),
    )

    moments = await build_bttf3_moments(db, settings.CHARACTER_VOICE_DEFAULT)

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
            "Seeded %d interactive moments for BTTF Part III",
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
