"""
Content Safety Service.

Triple-layer safety evaluation for Star in Story generated content:
1. Claude script review (language, themes, age-appropriateness)
2. Profanity and harmful content filter
3. Overall safety scoring against configurable threshold.
"""

import json
import logging
from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.story_episode import SafetyScore, StoryEpisode
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)

logger = logging.getLogger(__name__)

BLOCKED_PATTERNS = [
    "violence", "weapon", "blood", "death", "kill",
    "drug", "alcohol", "tobacco", "smoking",
    "sexual", "nude", "naked",
    "hate", "racist", "discrimination",
    "suicide", "self-harm",
]


class ContentSafetyService:
    """Evaluates generated content for child safety."""

    async def evaluate_episode(
        self,
        episode: StoryEpisode,
    ) -> SafetyScore:
        """
        Run safety evaluation on episode content.

        Returns SafetyScore with pass/fail determination.
        """
        job = StoryGenerationJob(
            episode_id=str(episode.id),
            user_id=episode.user_id,
            stage=StoryJobStage.SAFETY_REVIEW,
            total_items=2,
        )
        await job.insert()
        await job.start_processing()

        try:
            script_score, script_issues = await self._evaluate_script(
                episode
            )
            await job.update_progress(1)

            profanity_issues = self._check_profanity(episode)
            await job.update_progress(2)

            all_issues = script_issues + profanity_issues
            overall = script_score if not profanity_issues else min(
                script_score, 0.5
            )

            safety = SafetyScore(
                script_safety=script_score,
                visual_safety=1.0,
                overall_safety=overall,
                flagged_issues=all_issues,
            )

            episode.safety = safety
            await episode.save()

            await job.complete()

            logger.info(
                "Safety evaluation complete",
                extra={
                    "episode_id": str(episode.id),
                    "overall_safety": overall,
                    "issues_count": len(all_issues),
                    "passed": overall >= settings.STAR_STORY_SAFETY_THRESHOLD,
                },
            )
            return safety

        except Exception as exc:
            await job.fail(str(exc))
            raise

    async def _evaluate_script(
        self,
        episode: StoryEpisode,
    ) -> tuple:
        """Use Claude to evaluate script safety for children."""
        client = get_anthropic_client()

        all_narration = "\n".join(
            f"Scene {s.scene_number}: {s.narration}"
            for s in episode.scenes
        )

        response = await client.messages.create(
            model=settings.STAR_STORY_AI_MODEL,
            max_tokens=1024,
            system=(
                "You are a child content safety reviewer. "
                "Evaluate the script for a children's show (ages 4-10). "
                "Return JSON with: "
                '"safety_score" (0.0-1.0), '
                '"issues" (list of strings describing problems). '
                "Score 1.0 = perfectly safe, 0.0 = completely unsafe."
            ),
            messages=[{
                "role": "user",
                "content": f"Evaluate this children's script:\n\n{all_narration}",
            }],
        )

        text = response.content[0].text
        try:
            result = json.loads(text)
            score = float(result.get("safety_score", 0.0))
            issues = result.get("issues", [])
            return score, issues
        except (json.JSONDecodeError, ValueError):
            logger.warning(
                "Failed to parse safety response",
                extra={"episode_id": str(episode.id), "response": text[:200]},
            )
            return 0.5, ["Could not parse safety evaluation"]

    def _check_profanity(self, episode: StoryEpisode) -> List[str]:
        """Check script text for blocked content patterns."""
        issues = []
        for scene in episode.scenes:
            text_lower = (
                f"{scene.description} {scene.narration}"
            ).lower()
            for pattern in BLOCKED_PATTERNS:
                if pattern in text_lower:
                    issues.append(
                        f"Scene {scene.scene_number}: "
                        f"blocked pattern '{pattern}' detected"
                    )
        return issues

    async def evaluate_mission(self, mission) -> SafetyScore:
        """
        Run safety evaluation on interactive mission content.

        Evaluates all scene narrations across the mission for child safety.
        """
        all_narration = "\n".join(
            f"Scene {s.scene_number}: {s.narration_text}"
            for s in mission.scenes
        )

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.STAR_STORY_AI_MODEL,
            max_tokens=1024,
            system=(
                "You are a child content safety reviewer. "
                "Evaluate the script for a children's show (ages 4-10). "
                "Return JSON with: "
                '"safety_score" (0.0-1.0), '
                '"issues" (list of strings describing problems). '
                "Score 1.0 = perfectly safe, 0.0 = completely unsafe."
            ),
            messages=[{
                "role": "user",
                "content": f"Evaluate this children's script:\n\n{all_narration}",
            }],
        )

        text = response.content[0].text
        try:
            result = json.loads(text)
            script_score = float(result.get("safety_score", 0.0))
            issues = result.get("issues", [])
        except (json.JSONDecodeError, ValueError):
            logger.warning(
                "Failed to parse mission safety response",
                extra={"mission_id": str(mission.id), "response": text[:200]},
            )
            script_score = 0.5
            issues = ["Could not parse safety evaluation"]

        profanity_issues = self._check_mission_profanity(mission)
        all_issues = issues + profanity_issues
        overall = script_score if not profanity_issues else min(script_score, 0.5)

        safety = SafetyScore(
            script_safety=script_score,
            visual_safety=1.0,
            overall_safety=overall,
            flagged_issues=all_issues,
        )

        logger.info(
            "Mission safety evaluation complete",
            extra={
                "mission_id": str(mission.id),
                "overall_safety": overall,
                "issues_count": len(all_issues),
            },
        )
        return safety

    def _check_mission_profanity(self, mission) -> List[str]:
        """Check mission scene text for blocked content patterns."""
        issues = []
        for scene in mission.scenes:
            text_lower = (
                f"{scene.narration_text} {scene.narration_text_he}"
            ).lower()
            for pattern in BLOCKED_PATTERNS:
                if pattern in text_lower:
                    issues.append(
                        f"Scene {scene.scene_number}: "
                        f"blocked pattern '{pattern}' detected"
                    )
        return issues

    def passes_threshold(self, safety: SafetyScore) -> bool:
        """Check if safety score meets the configured threshold."""
        return safety.overall_safety >= settings.STAR_STORY_SAFETY_THRESHOLD


content_safety_service = ContentSafetyService()
