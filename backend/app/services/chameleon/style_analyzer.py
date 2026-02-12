"""
Style Analyzer Service.

Extracts visual style descriptors from show content by sampling frames
and analyzing them via Claude Vision. Returns palette, line weight,
shading, and texture attributes for style transfer input.
"""

import json
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_style_cache import StyleDescriptor
from app.models.content import Content

logger = get_logger(__name__)


class StyleAnalyzerService:
    """Extracts visual style descriptors from show content."""

    async def analyze_show_style(
        self, show_content_id: str
    ) -> StyleDescriptor:
        """
        Analyze the visual style of a show by sampling frames.

        Pipeline:
        1. Fetch content metadata from database
        2. Extract sample frames from the show video
        3. Send frames to Claude Vision for style analysis
        4. Return structured StyleDescriptor
        """
        content = await Content.get(show_content_id)
        if not content:
            raise ValueError(
                f"Content not found: {show_content_id}"
            )

        frames = await self._extract_frames(content)
        if not frames:
            logger.warning(
                "No frames extracted for style analysis",
                extra={"show_content_id": show_content_id},
            )
            return StyleDescriptor()

        descriptor = await self._analyze_with_vision(
            frames, show_content_id
        )

        logger.info(
            "Show style analyzed",
            extra={
                "show_content_id": show_content_id,
                "palette_count": len(descriptor.palette),
                "line_weight": descriptor.line_weight,
            },
        )

        return descriptor

    async def _extract_frames(
        self, content: Content
    ) -> List[bytes]:
        """
        Extract sample frames from show video for analysis.

        Uses media processing service to pull evenly-spaced frames.
        """
        video_path = getattr(content, "video_url", None) or getattr(
            content, "stream_url", None
        )
        if not video_path:
            return []

        from app.services.star_story.media_processing_service import (
            media_processing_service,
        )

        frame_count = settings.CHAMELEON_FRAME_SAMPLE_COUNT

        try:
            frames = await media_processing_service.extract_frames(
                video_path=video_path,
                count=frame_count,
            )
            return frames
        except Exception as exc:
            logger.warning(
                "Frame extraction failed",
                extra={
                    "content_id": str(content.id),
                    "error": str(exc),
                },
            )
            return []

    async def _analyze_with_vision(
        self,
        frames: List[bytes],
        show_content_id: str,
    ) -> StyleDescriptor:
        """Analyze frames with Claude Vision for style attributes."""
        import base64

        from app.core.ai_clients import get_anthropic_client

        client = get_anthropic_client()

        image_content = []
        for idx, frame_data in enumerate(frames):
            encoded = base64.standard_b64encode(frame_data).decode(
                "utf-8"
            )
            image_content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": encoded,
                    },
                }
            )

        image_content.append(
            {
                "type": "text",
                "text": (
                    "Analyze the visual art style of these animation frames. "
                    "Return JSON with: palette (list of hex colors), "
                    "line_weight (thin/medium/bold), "
                    "shading (flat/cel/gradient/realistic), "
                    "texture (smooth/grainy/painterly/digital)"
                ),
            }
        )

        response = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": image_content}],
        )

        raw = response.content[0].text
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            parsed = json.loads(raw[start:end])

        return StyleDescriptor(
            palette=parsed.get("palette", []),
            line_weight=parsed.get("line_weight", "medium"),
            shading=parsed.get("shading", "flat"),
            texture=parsed.get("texture", "smooth"),
        )


style_analyzer_service = StyleAnalyzerService()
