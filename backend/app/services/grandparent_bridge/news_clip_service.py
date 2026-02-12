"""
News Clip Service.

Generates AI news report videos starring the child's avatar,
summarizing their learning session for grandparents to view.
Pipeline: script generation -> Hebrew TTS -> lip-synced video -> share token.
"""

import hashlib
from uuid import uuid4

from app.api.routes.grandparent_bridge.schemas import SessionSummary
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.grandparent_bridge import NewsClip, NewsClipStatus

logger = get_logger(__name__)


class NewsClipService:
    """Generates and manages grandparent news clip videos."""

    async def generate_news_clip(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        session_summary: SessionSummary,
    ) -> NewsClip:
        """
        Generate a news report clip from a learning session.

        Pipeline:
        1. Generate bilingual news script via Claude
        2. Generate Hebrew TTS audio using child's cloned voice
        3. Generate lip-synced talking-head video via D-ID
        4. Create share token for grandparent delivery
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or access denied")

        share_token = uuid4().hex

        clip = NewsClip(
            user_id=user_id,
            profile_id=profile_id,
            avatar_id=avatar_id,
            share_token=share_token,
            status=NewsClipStatus.GENERATING,
            credits_charged=settings.CREDIT_RATE_NEWS_CLIP,
        )
        await clip.insert()

        try:
            script_en, script_he, vocabulary = await self._generate_script(
                session_summary=session_summary,
                child_name=avatar.child_first_name,
            )
            clip.script_text = script_en
            clip.script_text_he = script_he
            clip.vocabulary_featured = vocabulary

            from app.services.interactive_mission.child_voice_service import (
                child_voice_service,
            )

            audio_path = await child_voice_service.generate_corrected_hebrew(
                avatar=avatar, hebrew_text=script_he,
            )

            if audio_path:
                from app.services.interactive_mission.lipsync_service import (
                    lipsync_service,
                )

                video_path = await lipsync_service.generate_talking_head(
                    face_image_path=avatar.primary_avatar_gcs_path,
                    audio_path=audio_path,
                    mission_id=f"newsclip_{clip.id}",
                    scene_number=0,
                )
                clip.video_gcs_path = video_path

            share_base = settings.GRANDPARENT_BRIDGE_SHARE_BASE_URL
            clip.share_url = f"{share_base}/share/{share_token}"
            clip.status = NewsClipStatus.READY
            await clip.save()

            logger.info(
                "News clip generated",
                extra={
                    "clip_id": str(clip.id),
                    "user_id": user_id,
                    "profile_id": profile_id,
                },
            )
            return clip

        except Exception as exc:
            clip.status = NewsClipStatus.FAILED
            await clip.save()
            logger.error(
                "News clip generation failed",
                extra={
                    "clip_id": str(clip.id),
                    "error": str(exc),
                },
            )
            raise

    async def list_clips(
        self,
        user_id: str,
        profile_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list:
        """List news clips for a profile, newest first."""
        clips = await NewsClip.find(
            NewsClip.user_id == user_id,
            NewsClip.profile_id == profile_id,
            NewsClip.status != NewsClipStatus.DELETED,
        ).sort(
            -NewsClip.created_at
        ).skip(offset).limit(limit).to_list()

        return clips

    async def _generate_script(
        self,
        session_summary: SessionSummary,
        child_name: str,
    ) -> tuple:
        """Generate bilingual news report script via Claude."""
        from app.core.ai_clients import get_anthropic_client

        client = get_anthropic_client()

        vocabulary = session_summary.vocabulary
        topics = session_summary.topics
        score = session_summary.score

        prompt = (
            f"Write a short, fun news report script for a children's avatar "
            f"named {child_name}. The avatar is reporting on what they learned "
            f"today. Topics: {', '.join(topics)}. "
            f"Hebrew vocabulary practiced: {', '.join(vocabulary)}. "
            f"Score achieved: {score}. "
            f"Target duration: {settings.GRANDPARENT_BRIDGE_NEWS_CLIP_DURATION} seconds. "
            f"Return JSON with keys: script_en, script_he, vocabulary_featured"
        )

        import json

        response = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}") + 1
            parsed = json.loads(content[start:end])

        return (
            parsed.get("script_en", ""),
            parsed.get("script_he", ""),
            parsed.get("vocabulary_featured", vocabulary[:5]),
        )


news_clip_service = NewsClipService()
