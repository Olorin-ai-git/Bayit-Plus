"""
Scene Detection Service.

Analyzes subtitle tracks to identify scene boundaries based on dialogue gaps.
"""

from dataclasses import dataclass
from typing import List, Optional

from app.core.config import settings
from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc


@dataclass
class SceneMarker:
    """Marker for a detected scene."""

    start_time: float
    end_time: float
    subtitle_text: str
    cue_count: int


class SceneDetectionService:
    """Detect scenes from subtitle gaps."""

    def __init__(self):
        self.gap_threshold = getattr(
            settings, "SCENE_GAP_THRESHOLD_SECONDS", 5.0
        )
        self.min_duration = getattr(
            settings, "MIN_SCENE_DURATION_SECONDS", 30.0
        )

    async def detect_scenes(self, content_id: str) -> List[SceneMarker]:
        """
        Detect scene boundaries from subtitle gaps.

        Algorithm:
        1. Fetch all subtitle cues for content
        2. Iterate through cues, calculate gaps between end→start times
        3. When gap ≥ threshold, mark scene boundary
        4. Group cues into scenes
        5. Filter scenes with duration < min_duration
        6. Return scene markers with timing and aggregated text
        """
        # Get subtitle track
        track = await SubtitleTrackDoc.get_default_track(content_id)
        if not track or not track.cues:
            return []

        cues = track.cues
        if len(cues) < 2:
            return []

        scenes: List[SceneMarker] = []
        scene_start_idx = 0

        # Detect scene boundaries by analyzing gaps
        for i in range(len(cues) - 1):
            current_cue = cues[i]
            next_cue = cues[i + 1]

            # Calculate gap between current end and next start
            gap = next_cue.start_time - current_cue.end_time

            # Scene boundary detected
            if gap >= self.gap_threshold:
                scene_start_time = cues[scene_start_idx].start_time
                scene_end_time = current_cue.end_time
                scene_duration = scene_end_time - scene_start_time

                # Only include scenes meeting minimum duration
                if scene_duration >= self.min_duration:
                    scene_cues = cues[scene_start_idx : i + 1]
                    scene_text = self._aggregate_scene_text(scene_cues)

                    scenes.append(
                        SceneMarker(
                            start_time=scene_start_time,
                            end_time=scene_end_time,
                            subtitle_text=scene_text,
                            cue_count=len(scene_cues),
                        )
                    )

                # Start new scene
                scene_start_idx = i + 1

        # Handle final scene (from last boundary to end)
        if scene_start_idx < len(cues):
            scene_start_time = cues[scene_start_idx].start_time
            scene_end_time = cues[-1].end_time
            scene_duration = scene_end_time - scene_start_time

            if scene_duration >= self.min_duration:
                scene_cues = cues[scene_start_idx:]
                scene_text = self._aggregate_scene_text(scene_cues)

                scenes.append(
                    SceneMarker(
                        start_time=scene_start_time,
                        end_time=scene_end_time,
                        subtitle_text=scene_text,
                        cue_count=len(scene_cues),
                    )
                )

        return scenes

    async def get_scene_at_timestamp(
        self, content_id: str, timestamp: float
    ) -> Optional[SceneMarker]:
        """Get scene containing given timestamp."""
        scenes = await self.detect_scenes(content_id)
        for scene in scenes:
            if scene.start_time <= timestamp <= scene.end_time:
                return scene
        return None

    def _aggregate_scene_text(self, cues: List[SubtitleCueModel]) -> str:
        """Aggregate subtitle text from scene cues."""
        texts = [cue.text for cue in cues if cue.text.strip()]
        # Limit to 1000 chars for API context
        full_text = " ".join(texts)
        if len(full_text) > 1000:
            return full_text[:997] + "..."
        return full_text
