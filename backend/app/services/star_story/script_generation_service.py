"""
Script Generation Service.

Uses Claude to generate structured 12-scene scripts personalized
to the child's viewing history and vocabulary targets.
"""

import json
import logging
from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.child_proficiency import ChildProficiency
from app.models.story_episode import SceneScript, StoryEpisode
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)

logger = logging.getLogger(__name__)

SCENE_COUNT = 12


class ScriptGenerationService:
    """Generates personalized episode scripts via Claude."""

    async def generate_script(
        self,
        episode: StoryEpisode,
        child_name: str,
        proficiency: ChildProficiency,
    ) -> StoryEpisode:
        """
        Generate a 12-scene script personalized for the child.

        Uses viewing history and vocabulary targets to create
        age-appropriate Hebrew learning content.
        """
        job = StoryGenerationJob(
            episode_id=str(episode.id),
            user_id=episode.user_id,
            stage=StoryJobStage.SCRIPT_GENERATION,
            total_items=1,
        )
        await job.insert()
        await job.start_processing()

        try:
            scenes = await self._call_claude(
                child_name=child_name,
                theme=episode.theme,
                vocabulary=episode.target_vocabulary,
                level=proficiency.level.value,
                known_words=[w.word for w in proficiency.vocabulary_known[:50]],
            )

            episode.scenes = scenes
            await episode.save()

            await job.complete()

            logger.info(
                "Script generated",
                extra={
                    "episode_id": str(episode.id),
                    "scenes": len(scenes),
                    "theme": episode.theme,
                },
            )
            return episode

        except Exception as exc:
            await job.fail(str(exc))
            raise

    async def _call_claude(
        self,
        child_name: str,
        theme: str,
        vocabulary: List[str],
        level: str,
        known_words: List[str],
    ) -> List[SceneScript]:
        """Call Claude API to generate structured scene scripts."""
        client = get_anthropic_client()

        system_prompt = (
            "You are a children's show writer creating personalized "
            "Hebrew learning episodes. Generate exactly 12 scenes. "
            "Each scene is 10 seconds of animation. "
            "The child is the hero of the story. "
            "Naturally weave Hebrew vocabulary into the narration. "
            "Keep language age-appropriate and encouraging. "
            "Return valid JSON only."
        )

        user_prompt = (
            f"Create a {SCENE_COUNT}-scene episode for {child_name}.\n"
            f"Theme: {theme}\n"
            f"Hebrew level: {level}\n"
            f"Target vocabulary to teach: {', '.join(vocabulary)}\n"
            f"Words the child already knows: {', '.join(known_words[:20])}\n\n"
            f"Return JSON array of scenes:\n"
            f'[{{"scene_number": 1, "description": "visual description", '
            f'"narration": "narrator text with Hebrew words", '
            f'"hebrew_vocabulary": ["word1"], '
            f'"duration_seconds": 10.0}}]'
        )

        response = await client.messages.create(
            model=settings.STAR_STORY_AI_MODEL,
            max_tokens=settings.STAR_STORY_AI_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        text = response.content[0].text
        scenes_data = json.loads(text)

        return [
            SceneScript(
                scene_number=s["scene_number"],
                description=s["description"],
                narration=s["narration"],
                hebrew_vocabulary=s.get("hebrew_vocabulary", []),
                duration_seconds=s.get("duration_seconds", 10.0),
            )
            for s in scenes_data
        ]


script_generation_service = ScriptGenerationService()
