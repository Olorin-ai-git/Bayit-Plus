"""
Unit tests for SceneDetectionService

Tests scene boundary detection based on subtitle gap analysis.
"""
import pytest
from unittest.mock import AsyncMock, patch
from app.services.scene_detection_service import SceneDetectionService, SceneMarker
from app.models.subtitle import SubtitleCueModel


@pytest.fixture
def scene_service():
    """Create SceneDetectionService instance."""
    return SceneDetectionService()


@pytest.fixture
def continuous_subtitles():
    """Subtitles with no significant gaps (continuous dialogue)."""
    return [
        SubtitleCueModel(
            cue_id="1",
            start_time=0.0,
            end_time=2.5,
            text="First line of dialogue",
        ),
        SubtitleCueModel(
            cue_id="2",
            start_time=2.8,
            end_time=5.0,
            text="Second line",
        ),
        SubtitleCueModel(
            cue_id="3",
            start_time=5.3,
            end_time=8.0,
            text="Third line",
        ),
    ]


@pytest.fixture
def subtitles_with_scene_gap():
    """Subtitles with 5-second gap indicating scene change."""
    return [
        SubtitleCueModel(
            cue_id="1",
            start_time=0.0,
            end_time=10.0,
            text="Scene 1 dialogue line 1",
        ),
        SubtitleCueModel(
            cue_id="2",
            start_time=10.5,
            end_time=20.0,
            text="Scene 1 dialogue line 2",
        ),
        # 5-second gap here (20.0 → 25.0)
        SubtitleCueModel(
            cue_id="3",
            start_time=25.0,
            end_time=35.0,
            text="Scene 2 dialogue line 1",
        ),
    ]


@pytest.fixture
def subtitles_with_large_gap():
    """Subtitles with 10-second gap (well above threshold)."""
    return [
        SubtitleCueModel(
            cue_id="1",
            start_time=0.0,
            end_time=15.0,
            text="First scene",
        ),
        # 10-second gap (15.0 → 25.0)
        SubtitleCueModel(
            cue_id="2",
            start_time=25.0,
            end_time=40.0,
            text="Second scene",
        ),
    ]


@pytest.mark.asyncio
async def test_detect_scenes_with_gap(scene_service, subtitles_with_scene_gap):
    """Test scene detection with 5-second gap."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=subtitles_with_scene_gap
    ):
        scenes = await scene_service.detect_scenes("test-content-id")

        assert len(scenes) == 1  # One scene detected before gap
        assert scenes[0].start_time == 0.0
        assert scenes[0].end_time == 20.0
        assert scenes[0].cue_count == 2
        assert "Scene 1" in scenes[0].subtitle_text


@pytest.mark.asyncio
async def test_detect_scenes_with_large_gap(scene_service, subtitles_with_large_gap):
    """Test scene detection with 10-second gap."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=subtitles_with_large_gap
    ):
        scenes = await scene_service.detect_scenes("test-content-id")

        assert len(scenes) == 1
        assert scenes[0].end_time == 15.0


@pytest.mark.asyncio
async def test_no_scenes_continuous_dialogue(scene_service, continuous_subtitles):
    """Test that continuous dialogue with small gaps returns no scenes."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=continuous_subtitles
    ):
        scenes = await scene_service.detect_scenes("test-content-id")

        # No scenes detected (gaps too small)
        assert len(scenes) == 0


@pytest.mark.asyncio
async def test_empty_subtitles(scene_service):
    """Test handling of content with no subtitles."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=[]
    ):
        scenes = await scene_service.detect_scenes("test-content-id")
        assert len(scenes) == 0


@pytest.mark.asyncio
async def test_single_subtitle_cue(scene_service):
    """Test handling of content with only one subtitle cue."""
    single_cue = [
        SubtitleCueModel(
            cue_id="1",
            start_time=0.0,
            end_time=5.0,
            text="Only one line",
        )
    ]

    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=single_cue
    ):
        scenes = await scene_service.detect_scenes("test-content-id")
        assert len(scenes) == 0  # No gap to detect


@pytest.mark.asyncio
async def test_get_scene_at_timestamp(scene_service, subtitles_with_scene_gap):
    """Test retrieving scene containing specific timestamp."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=subtitles_with_scene_gap
    ):
        # Timestamp within first scene
        scene = await scene_service.get_scene_at_timestamp(
            "test-content-id",
            15.0
        )

        assert scene is not None
        assert scene.start_time == 0.0
        assert scene.end_time == 20.0


@pytest.mark.asyncio
async def test_get_scene_at_timestamp_no_match(scene_service, subtitles_with_scene_gap):
    """Test get_scene_at_timestamp with timestamp outside scenes."""
    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=subtitles_with_scene_gap
    ):
        # Timestamp in gap area (no scene)
        scene = await scene_service.get_scene_at_timestamp(
            "test-content-id",
            22.0
        )

        assert scene is None


@pytest.mark.asyncio
async def test_min_scene_duration_filter(scene_service):
    """Test that scenes shorter than min_duration are filtered out."""
    short_scene = [
        SubtitleCueModel(cue_id="1", start_time=0.0, end_time=10.0, text="Short"),
        # 5-second gap, but scene is only 10s (< 30s min)
        SubtitleCueModel(cue_id="2", start_time=15.0, end_time=20.0, text="Next"),
    ]

    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=short_scene
    ):
        scenes = await scene_service.detect_scenes("test-content-id")

        # Scene filtered out due to duration < 30s
        assert len(scenes) == 0


@pytest.mark.asyncio
async def test_subtitle_text_aggregation(scene_service):
    """Test that subtitle text is properly aggregated for scenes."""
    subtitles = [
        SubtitleCueModel(cue_id="1", start_time=0.0, end_time=30.0, text="Line 1"),
        SubtitleCueModel(cue_id="2", start_time=30.5, end_time=60.0, text="Line 2"),
        # 5-second gap
        SubtitleCueModel(cue_id="3", start_time=65.0, end_time=70.0, text="Line 3"),
    ]

    with patch.object(
        scene_service,
        '_fetch_subtitles',
        new_callable=AsyncMock,
        return_value=subtitles
    ):
        scenes = await scene_service.detect_scenes("test-content-id")

        assert len(scenes) == 1
        # Check subtitle text contains both lines
        assert "Line 1" in scenes[0].subtitle_text
        assert "Line 2" in scenes[0].subtitle_text
        assert scenes[0].cue_count == 2
