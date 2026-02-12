"""
Zine Generation Service.

Uses Claude to generate personalized weekly comics based on
a child's viewing history and vocabulary targets.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.zine import WeeklyZine, ZinePage, ZineStatus
from app.services.security_utils import sanitize_for_prompt

logger = logging.getLogger(__name__)

ZINE_SYSTEM_PROMPT = (
    "You are a Hebrew educational comic creator for children. "
    "Create engaging, age-appropriate zine pages that teach Hebrew "
    "vocabulary through storytelling. Each page should have a title, "
    "content (a short story segment), and vocabulary words used. "
    "Respond in JSON format only."
)


class ZineGenerationService:
    """Generates personalized weekly zines via Claude."""

    async def generate_zine(
        self,
        user_id: str,
        profile_id: Optional[str],
        week_key: str,
        content_themes: List[str],
        vocabulary_targets: List[str],
    ) -> WeeklyZine:
        """Generate a new weekly zine from themes and vocabulary."""
        existing = await WeeklyZine.find_one(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "week_key": week_key,
            }
        )
        if existing and existing.status == ZineStatus.READY:
            return existing

        zine = existing or WeeklyZine(
            user_id=user_id,
            profile_id=profile_id,
            week_key=week_key,
            title="",
            title_he="",
            content_themes=content_themes,
            vocabulary_targets=vocabulary_targets,
        )

        zine.status = ZineStatus.GENERATING
        if not existing:
            await zine.insert()
        else:
            await zine.save()

        try:
            pages = await self._generate_pages(
                content_themes, vocabulary_targets
            )
            zine.pages = pages
            zine.total_pages = len(pages)
            zine.title = pages[0].title if pages else "Weekly Zine"
            zine.title_he = (
                pages[0].title_he if pages else "מגזין שבועי"
            )
            zine.status = ZineStatus.READY
            zine.generated_at = datetime.now(timezone.utc)

            logger.info(
                "Zine generated successfully",
                extra={
                    "user_id": user_id,
                    "week_key": week_key,
                    "pages": len(pages),
                },
            )
        except Exception as exc:
            zine.status = ZineStatus.FAILED
            logger.error(
                "Zine generation failed",
                extra={
                    "user_id": user_id,
                    "week_key": week_key,
                    "error": str(exc),
                },
            )

        await zine.save()
        return zine

    async def _generate_pages(
        self,
        themes: List[str],
        vocabulary: List[str],
    ) -> List[ZinePage]:
        """Generate zine pages using Claude."""
        safe_themes = sanitize_for_prompt(", ".join(themes))
        safe_vocab = sanitize_for_prompt(", ".join(vocabulary))

        prompt = (
            f"Create a {settings.ZINE_MAX_PAGES}-page Hebrew learning "
            f"comic about these themes: {safe_themes}. "
            f"Incorporate these vocabulary words: {safe_vocab}. "
            f"Return JSON array of pages with fields: "
            f"page_number, title, title_he, content, content_he, "
            f"vocabulary_words (list of Hebrew words used)."
        )

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.ZINE_AI_MODEL,
            max_tokens=settings.ZINE_MAX_TOKENS,
            system=ZINE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        pages_data = self._parse_json_response(text)

        return [
            ZinePage(
                page_number=p.get("page_number", idx + 1),
                title=p.get("title", ""),
                title_he=p.get("title_he", ""),
                content=p.get("content", ""),
                content_he=p.get("content_he", ""),
                vocabulary_words=p.get("vocabulary_words", []),
            )
            for idx, p in enumerate(pages_data)
        ]

    def _parse_json_response(self, text: str) -> list:
        """Parse JSON from Claude response, handling markdown fences."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)

    async def get_current_zine(
        self,
        user_id: str,
        profile_id: Optional[str],
        week_key: str,
    ) -> Optional[WeeklyZine]:
        """Get the current week's zine if it exists."""
        return await WeeklyZine.find_one(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "week_key": week_key,
            }
        )

    async def get_zine_archive(
        self,
        user_id: str,
        profile_id: Optional[str],
        limit: int = 10,
        offset: int = 0,
    ) -> List[WeeklyZine]:
        """Get past zines for a user."""
        return (
            await WeeklyZine.find(
                {
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "status": ZineStatus.READY,
                }
            )
            .sort("-week_key")
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def mark_viewed(
        self,
        user_id: str,
        zine_id: str,
    ) -> Optional[WeeklyZine]:
        """Mark a zine as viewed."""
        from beanie import PydanticObjectId

        zine = await WeeklyZine.get(PydanticObjectId(zine_id))
        if not zine or zine.user_id != user_id:
            return None

        zine.viewed = True
        zine.viewed_at = datetime.now(timezone.utc)
        await zine.save()
        return zine


zine_generation_service = ZineGenerationService()
