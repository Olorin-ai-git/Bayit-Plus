"""
Stability AI In-painting Service.

Uses Stability AI SDXL Edit API to seamlessly blend the child's avatar
INTO show scene backgrounds. Produces higher quality than FFmpeg overlay.
"""

from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class InpaintingService:
    """Stability AI SDXL Edit API integration for scene in-painting."""

    async def inpaint_avatar(
        self,
        background_path: str,
        avatar_path: str,
        output_path: str,
        position_x: float = 0.5,
        position_y: float = 0.5,
        scale: float = 0.3,
    ) -> str:
        """
        Blend avatar into scene background using Stability AI.

        Args:
            background_path: GCS path to scene background frame
            avatar_path: GCS path to avatar pose PNG
            output_path: GCS path for composited output
            position_x: Horizontal position (0-1)
            position_y: Vertical position (0-1)
            scale: Avatar scale relative to background

        Returns:
            GCS path to the inpainted composite image
        """
        from app.services.olorin.storage_service import storage_service

        bg_bytes = await storage_service.download_bytes(background_path)
        avatar_bytes = await storage_service.download_bytes(avatar_path)

        mask_bytes = self._generate_position_mask(
            bg_bytes, position_x, position_y, scale
        )

        result_bytes = await self._call_stability_api(
            image_bytes=bg_bytes,
            mask_bytes=mask_bytes,
            avatar_bytes=avatar_bytes,
        )

        await storage_service.upload_bytes(
            result_bytes, output_path, content_type="image/png"
        )

        logger.info(
            "Inpainting complete",
            extra={"output_path": output_path},
        )
        return output_path

    async def _call_stability_api(
        self,
        image_bytes: bytes,
        mask_bytes: bytes,
        avatar_bytes: bytes,
    ) -> bytes:
        """Call Stability AI SDXL Edit API."""
        api_key = settings.STABILITY_API_KEY
        if not api_key:
            raise ValueError("STABILITY_API_KEY not configured")

        base_url = settings.STABILITY_API_BASE_URL

        async with httpx.AsyncClient(timeout=settings.STABILITY_API_TIMEOUT) as client:
            response = await client.post(
                f"{base_url}/stable-image/edit/inpaint",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Accept": "image/png",
                },
                files={
                    "image": ("scene.png", image_bytes, "image/png"),
                    "mask": ("mask.png", mask_bytes, "image/png"),
                },
                data={
                    "prompt": (
                        "Seamlessly blend the character into the "
                        "scene, matching lighting and art style"
                    ),
                    "output_format": "png",
                },
            )
            response.raise_for_status()
            return response.content

    def _generate_position_mask(
        self,
        bg_bytes: bytes,
        x: float,
        y: float,
        scale: float,
    ) -> bytes:
        """
        Generate a position mask for where the avatar should be placed.

        White region = area to inpaint, black = preserve.
        """
        from io import BytesIO

        from PIL import Image, ImageDraw

        bg = Image.open(BytesIO(bg_bytes))
        w, h = bg.size

        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)

        avatar_w = int(w * scale)
        avatar_h = int(h * scale * 1.5)
        cx = int(w * x)
        cy = int(h * y)

        left = cx - avatar_w // 2
        top = cy - avatar_h // 2
        right = cx + avatar_w // 2
        bottom = cy + avatar_h // 2

        draw.rectangle([left, top, right, bottom], fill=255)

        buf = BytesIO()
        mask.save(buf, format="PNG")
        return buf.getvalue()


inpainting_service = InpaintingService()
