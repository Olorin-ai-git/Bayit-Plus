"""
Scene Analyzer for Smart Avatar Positioning

Analyzes video frames to detect regions of interest and compute safe
avatar placement positions that avoid occluding important visual content.
Uses luminance variance heuristics on a 3x3 grid (no external ML deps).
"""

import tempfile
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import AvatarPlacement, BoundingBox
from app.services.ffmpeg.service import ffmpeg_service

logger = get_logger(__name__)

GRID_ROWS = 3
GRID_COLS = 3

QUADRANT_CANDIDATES = [
    ("top_left", 0.0, 0.0, 0.5, 0.5),
    ("top_right", 0.5, 0.0, 1.0, 0.5),
    ("bottom_left", 0.0, 0.5, 0.5, 1.0),
    ("bottom_right", 0.5, 0.5, 1.0, 1.0),
]

BOTTOM_POSITION_BONUS = 0.15
VARIANCE_THRESHOLD = 800.0


class SceneAnalyzer:
    """Analyzes video frames to determine safe avatar overlay positions."""

    async def analyze_frame_for_placement(
        self,
        video_url: str,
        timestamp: float,
    ) -> AvatarPlacement:
        """
        Analyze a video frame and compute optimal avatar placement.

        Extracts the frame, detects regions of interest via luminance
        variance, and scores quadrant candidates to find the least
        intrusive position.
        """
        try:
            frame_bytes = await self._extract_frame_bytes(
                video_url, timestamp
            )
            rois = self._detect_regions_of_interest(frame_bytes)
            placement = self._compute_safe_placement(rois)

            logger.info(
                "Frame analyzed for avatar placement",
                extra={
                    "timestamp": timestamp,
                    "rois_count": len(rois),
                    "position": placement.position,
                    "confidence": placement.confidence,
                },
            )
            return placement

        except Exception as exc:
            logger.error(
                "Scene analysis failed, using default placement",
                extra={"timestamp": timestamp, "error": str(exc)},
            )
            return AvatarPlacement(
                position=settings.VOD_INTERACTION_DEFAULT_AVATAR_POSITION,
                confidence=0.0,
                fallback_position=settings.VOD_INTERACTION_DEFAULT_AVATAR_POSITION,
                regions_of_interest=[],
            )

    async def _extract_frame_bytes(
        self,
        video_url: str,
        timestamp: float,
    ) -> bytes:
        """Extract a single frame from the video as JPEG bytes."""
        with tempfile.NamedTemporaryFile(
            suffix=".jpg", delete=False
        ) as tmp:
            output_path = tmp.name

        await ffmpeg_service.capture_screenshot(
            video_path=video_url,
            output_path=output_path,
            timestamp_seconds=int(timestamp),
        )

        import os

        with open(output_path, "rb") as f:
            frame_data = f.read()

        os.unlink(output_path)
        return frame_data

    def _detect_regions_of_interest(
        self,
        frame_bytes: bytes,
    ) -> List[BoundingBox]:
        """
        Detect regions of interest using luminance variance on a 3x3 grid.

        High-variance cells indicate faces, action, or text overlays
        that the avatar should avoid occluding.
        """
        from PIL import Image
        from io import BytesIO

        img = Image.open(BytesIO(frame_bytes)).convert("L")
        width, height = img.size
        pixels = list(img.getdata())

        cell_w = width // GRID_COLS
        cell_h = height // GRID_ROWS
        rois: List[BoundingBox] = []

        for row in range(GRID_ROWS):
            for col in range(GRID_COLS):
                cell_pixels = []
                for y in range(row * cell_h, min((row + 1) * cell_h, height)):
                    start = y * width + col * cell_w
                    end = start + min(cell_w, width - col * cell_w)
                    cell_pixels.extend(pixels[start:end])

                if not cell_pixels:
                    continue

                mean_val = sum(cell_pixels) / len(cell_pixels)
                variance = sum(
                    (p - mean_val) ** 2 for p in cell_pixels
                ) / len(cell_pixels)

                if variance > VARIANCE_THRESHOLD:
                    rois.append(BoundingBox(
                        x=col / GRID_COLS,
                        y=row / GRID_ROWS,
                        w=1.0 / GRID_COLS,
                        h=1.0 / GRID_ROWS,
                        label=f"roi_r{row}_c{col}",
                    ))

        return rois

    def _compute_safe_placement(
        self,
        rois: List[BoundingBox],
    ) -> AvatarPlacement:
        """
        Score quadrant candidates and return the best avatar position.

        Penalizes overlap with ROIs, gives bonus to bottom positions
        (less intrusive for video viewing).
        """
        best_position = settings.VOD_INTERACTION_DEFAULT_AVATAR_POSITION
        best_score = -1.0
        fallback = settings.VOD_INTERACTION_DEFAULT_AVATAR_POSITION

        for name, qx1, qy1, qx2, qy2 in QUADRANT_CANDIDATES:
            overlap_count = 0
            for roi in rois:
                rx1 = roi.x
                ry1 = roi.y
                rx2 = roi.x + roi.w
                ry2 = roi.y + roi.h

                if rx1 < qx2 and rx2 > qx1 and ry1 < qy2 and ry2 > qy1:
                    overlap_count += 1

            max_cells_in_quadrant = (GRID_ROWS * GRID_COLS) // 4 or 1
            overlap_penalty = overlap_count / max_cells_in_quadrant

            score = 1.0 - overlap_penalty
            if name.startswith("bottom"):
                score += BOTTOM_POSITION_BONUS

            if score > best_score:
                best_score = score
                fallback = best_position
                best_position = name

        confidence = min(max(best_score, 0.0), 1.0)

        return AvatarPlacement(
            position=best_position,
            offset_x=0.05,
            offset_y=0.05,
            confidence=confidence,
            fallback_position=fallback,
            regions_of_interest=rois,
        )


scene_analyzer = SceneAnalyzer()
