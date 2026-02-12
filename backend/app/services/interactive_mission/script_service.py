"""
Interactive Mission Script Service.

Generates branching mission scripts with Hebrew challenges using Claude API.
Input: show episode content, child proficiency, known vocabulary.
Output: 6-10 scene scripts with 3-5 decision points.
"""

import json
import re

from app.core.logging_config import get_logger
from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.child_proficiency import ChildProficiency
from app.models.interactive_mission import (
    DecisionType,
    InteractiveMission,
    MissionDecision,
    MissionScene,
)

logger = get_logger(__name__)

SCRIPT_SYSTEM_PROMPT = (
    "You are a children's educational scriptwriter for an interactive "
    "Hebrew learning experience. Create engaging 2-minute branching "
    "missions where a child's avatar enters show scenes and speaks "
    "corrected Hebrew. Each mission has 6-10 scenes with 3-5 decision "
    "points. Decision types: binary (yes/no), vocabulary (say the "
    "Hebrew word), direction (left/right). Adapt difficulty to the "
    "child's proficiency level. Output valid JSON."
)


class ScriptService:
    """Generates mission scripts via Claude API."""

    async def generate_script(
        self,
        mission: InteractiveMission,
        child_name: str,
        proficiency: ChildProficiency,
    ) -> None:
        """
        Generate a branching mission script for an episode.

        Updates the mission document with generated scenes and decisions.
        """
        known_words = [
            w.word for w in proficiency.vocabulary_known[:50]
        ]
        learning_words = [
            w.word for w in proficiency.vocabulary_learning[:20]
        ]

        prompt = self._build_prompt(
            child_name=child_name,
            show_content_id=mission.show_content_id,
            proficiency_level=proficiency.level.value,
            known_words=known_words,
            learning_words=learning_words,
            max_scenes=settings.MISSION_MAX_SCENES,
            max_branches=settings.MISSION_MAX_BRANCHES,
        )

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.STAR_STORY_AI_MODEL,
            max_tokens=settings.STAR_STORY_AI_MAX_TOKENS,
            system=SCRIPT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        script_data = self._parse_response(response)
        scenes = self._build_scenes(script_data)

        mission.scenes = scenes
        mission.title = script_data.get("title", "Hebrew Mission")
        mission.title_he = script_data.get("title_he", "")
        mission.description = script_data.get("description", "")
        mission.difficulty = script_data.get(
            "difficulty", proficiency.level.value
        )
        mission.target_vocabulary = script_data.get(
            "target_vocabulary", learning_words[:10]
        )
        await mission.save()

        logger.info(
            "Mission script generated",
            extra={
                "mission_id": str(mission.id),
                "scene_count": len(scenes),
                "decision_count": sum(
                    1 for s in scenes if s.decision
                ),
            },
        )

    @staticmethod
    def _sanitize(value: str, max_len: int = 100) -> str:
        """Sanitize user input to prevent prompt injection."""
        s = re.sub(r"[\n\r\t]", " ", value)
        s = re.sub(r"(system:|assistant:|human:|<\||\|>|```|<<|>>)", "", s, flags=re.IGNORECASE)
        return re.sub(r"[^\w\s\u0590-\u05FF\-.,']", "", s)[:max_len].strip()

    def _build_prompt(
        self, child_name: str, show_content_id: str, proficiency_level: str,
        known_words: List[str], learning_words: List[str], max_scenes: int, max_branches: int,
    ) -> str:
        """Build the script generation prompt with sanitized inputs."""
        safe_name = self._sanitize(child_name, max_len=50)
        safe_content_id = self._sanitize(show_content_id, max_len=64)
        safe_known = [self._sanitize(w, max_len=30) for w in known_words[:20]]
        safe_learning = [self._sanitize(w, max_len=30) for w in learning_words[:10]]
        return (
            f"Create an interactive Hebrew mission for {safe_name}.\n"
            f"Show content ID: {safe_content_id}\n"
            f"Hebrew level: {proficiency_level}\n"
            f"Known words: {', '.join(safe_known)}\n"
            f"Learning words: {', '.join(safe_learning)}\n"
            f"Max scenes: {max_scenes}, Max branches: {max_branches}\n"
            f"Include 3-5 speech-gated decision points.\n"
            f"decision_type values: binary, vocabulary, direction, voice_phrase.\n"
            f"voice_phrase decisions require the child to speak a Hebrew phrase aloud.\n"
            f"Include at least 1 voice_phrase decision for pronunciation practice.\n"
            f"Output JSON with: title, title_he, description, "
            f"difficulty, target_vocabulary, scenes[].\n"
            f"Each scene: scene_number, narration_text, "
            f"narration_text_he, hebrew_vocabulary[], "
            f"duration_seconds, avatar_pose, is_lipsync_scene, "
            f"decision (optional: decision_id, decision_type, "
            f"prompt_text, prompt_transliteration, prompt_translation, "
            f"expected_responses[], hint_text, "
            f"hint_text_he, next_scene_on_success, "
            f"next_scene_on_failure)."
        )

    def _parse_response(self, response) -> dict:
        """Parse Claude response into script data."""
        text = response.content[0].text
        # Extract JSON from potential markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        return json.loads(text.strip())

    def _build_scenes(self, script_data: dict) -> List[MissionScene]:
        """Convert parsed script data to MissionScene models."""
        scenes = []
        for s in script_data.get("scenes", []):
            decision = None
            if s.get("decision"):
                d = s["decision"]
                decision = MissionDecision(
                    decision_id=d.get("decision_id", f"d_{s['scene_number']}"),
                    decision_type=DecisionType(
                        d.get("decision_type", "vocabulary")
                    ),
                    prompt_text=d.get("prompt_text", ""),
                    prompt_transliteration=d.get(
                        "prompt_transliteration", ""
                    ),
                    prompt_translation=d.get("prompt_translation", ""),
                    expected_responses=d.get("expected_responses", []),
                    hint_text=d.get("hint_text"),
                    hint_text_he=d.get("hint_text_he"),
                    next_scene_on_success=d.get(
                        "next_scene_on_success", 0
                    ),
                    next_scene_on_failure=d.get(
                        "next_scene_on_failure", 0
                    ),
                )

            scene = MissionScene(
                scene_number=s["scene_number"],
                narration_text=s.get("narration_text", ""),
                narration_text_he=s.get("narration_text_he", ""),
                hebrew_vocabulary=s.get("hebrew_vocabulary", []),
                duration_seconds=s.get("duration_seconds", 10.0),
                avatar_pose=s.get("avatar_pose", "front_neutral"),
                is_lipsync_scene=s.get("is_lipsync_scene", False),
                decision=decision,
            )
            scenes.append(scene)

        return scenes


script_service = ScriptService()
