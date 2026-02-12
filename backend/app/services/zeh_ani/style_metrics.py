"""
Style Metrics.

CLIP scoring via Stability AI and ControlNet style transfer application
utilities used by ControlNetStyleService.
"""

from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.avatar_style_cache import AvatarPoseCache, StyleDescriptor
from app.models.child_avatar import ChildAvatar

logger = get_logger(__name__)


async def apply_controlnet(
    pose_bytes: bytes,
    style: StyleDescriptor,
    avatar: ChildAvatar,
    pose_name: str,
    show_content_id: str,
    cache_id: str,
) -> Optional[AvatarPoseCache]:
    """Apply ControlNet + IP-Adapter style transfer to rendered pose."""
    from app.services.olorin.storage_service import storage_service

    style_prompt = (
        f"Redraw in style: colors {', '.join(style.palette[:5])}, "
        f"{style.line_weight} line weight, "
        f"{style.shading} shading, {style.texture} texture. "
        f"Maintain character identity. "
        f"ControlNet strength: {settings.CONTROLNET_STYLE_STRENGTH}"
    )

    timeout = settings.CONTROLNET_TIMEOUT
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{settings.CONTROLNET_API_BASE_URL}/v1/predictions",
            headers={
                "Authorization": f"Token {settings.CONTROLNET_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "input": {
                    "prompt": style_prompt,
                    "image": pose_bytes.hex(),
                    "controlnet_conditioning_scale": (
                        settings.CONTROLNET_STYLE_STRENGTH
                    ),
                },
            },
        )
        response.raise_for_status()
        result_data = response.json()
        output_url = result_data.get("output", [""])[0]

    if not output_url:
        return None

    result_response = await download_result(output_url)
    output_path = (
        f"zeh-ani/controlnet/{avatar.id}/{show_content_id}/"
        f"{pose_name}_{cache_id}.png"
    )
    await storage_service.upload_bytes(
        result_response, output_path, content_type="image/png",
    )
    return AvatarPoseCache(
        pose_name=pose_name, gcs_path=output_path,
        width=512, height=512,
    )


async def download_result(url: str) -> bytes:
    """Download ControlNet result image."""
    timeout = settings.CONTROLNET_TIMEOUT
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def compute_clip_score(poses: list) -> float:
    """Compute average CLIP similarity across poses via Stability AI."""
    if not poses:
        return 0.0
    from app.services.olorin.storage_service import storage_service

    scores = []
    for pose in poses:
        image_bytes = await storage_service.download_bytes(pose.gcs_path)
        score = await clip_score_single(image_bytes)
        scores.append(score)
    return sum(scores) / len(scores)


async def clip_score_single(image_bytes: bytes) -> float:
    """Score image quality via Stability AI image quality endpoint."""
    timeout = settings.STABILITY_API_TIMEOUT
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{settings.STABILITY_API_BASE_URL}/v1/generation/image-quality",
            headers={
                "Authorization": f"Bearer {settings.STABILITY_API_KEY}",
                "Accept": "application/json",
            },
            files={
                "image": ("output.png", image_bytes, "image/png"),
            },
        )
        if response.status_code == 200:
            data = response.json()
            return float(data.get("quality_score", 0.0))
    return 0.0
