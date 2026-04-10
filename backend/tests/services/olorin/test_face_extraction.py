from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import numpy as np
import pytest
from app.services.olorin.face_extraction import (
    FaceExtractionService,
    FaceExtractionError,
    NoFaceDetectedError,
)


@pytest.fixture
def service(tmp_path):
    storage_service = AsyncMock()
    storage_service.upload_file.return_value = "https://gcs/portraits/c1/alice.jpg"
    model_path = tmp_path / "yunet.onnx"
    model_path.write_bytes(b"dummy")
    return FaceExtractionService(
        storage_service=storage_service,
        model_path=model_path,
    )


def test_pick_best_speech_timestamp_returns_longest_segment(service):
    segments = [
        {"start": 1.0, "end": 3.0, "text": "short"},
        {"start": 10.0, "end": 18.0, "text": "long one"},
        {"start": 20.0, "end": 22.0, "text": "short"},
    ]
    ts = service._pick_best_speech_timestamp(segments)
    # Midpoint of longest segment: (10 + 18) / 2 = 14.0
    assert ts == 14.0


def test_pick_best_raises_on_empty(service):
    with pytest.raises(FaceExtractionError, match="no speech segments"):
        service._pick_best_speech_timestamp([])


@pytest.mark.asyncio
async def test_extract_frame_calls_ffmpeg(service, tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"fake")
    output = tmp_path / "frame.jpg"

    with patch("asyncio.create_subprocess_exec") as mock_exec:
        proc = AsyncMock()
        proc.returncode = 0
        proc.communicate.return_value = (b"", b"")
        mock_exec.return_value = proc
        # Pretend ffmpeg wrote the file
        output.write_bytes(b"jpeg_bytes")

        result = await service._extract_frame_at(video, 14.0, output)
        assert result == output
        mock_exec.assert_called_once()
        args = mock_exec.call_args[0]
        assert "ffmpeg" in args
        assert "-ss" in args
        assert "14.0" in args


def test_detect_face_returns_none_when_no_face(service, tmp_path):
    """YuNet returns (retval, None) when no face is found."""
    frame = tmp_path / "frame.jpg"
    frame.write_bytes(b"not a real image")

    fake_image = np.zeros((480, 640, 3), dtype=np.uint8)
    with patch("app.services.olorin.face_extraction.cv2.imread", return_value=fake_image), \
         patch.object(service, "_get_detector") as mock_get:
        detector = MagicMock()
        detector.detect.return_value = (1, None)
        mock_get.return_value = detector
        assert service._detect_face(frame) is None


def test_detect_face_returns_cropped_image_when_face_found(service, tmp_path):
    """YuNet returns (retval, faces) where each row is [x, y, w, h, landmarks*10, conf]."""
    frame = tmp_path / "frame.jpg"
    frame.write_bytes(b"not a real image")

    # 1000x1000 image, face box at (200, 150) sized 300x300
    fake_image = np.full((1000, 1000, 3), 128, dtype=np.uint8)
    # YuNet face row: [x, y, w, h, lx1, ly1, ..., lx5, ly5, score]  (15 cols)
    face_row = np.array(
        [[200, 150, 300, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.95]],
        dtype=np.float32,
    )

    with patch("app.services.olorin.face_extraction.cv2.imread", return_value=fake_image), \
         patch.object(service, "_get_detector") as mock_get:
        detector = MagicMock()
        detector.detect.return_value = (1, face_row)
        mock_get.return_value = detector
        crop = service._detect_face(frame)
        assert crop is not None
        # With 30% padding: x = 200 - 90 = 110, y = 150 - 90 = 60
        # x2 = 200 + 300 + 90 = 590, y2 = 150 + 300 + 90 = 540
        # Crop shape: (540 - 60, 590 - 110) = (480, 480)
        assert crop.shape == (480, 480, 3)


@pytest.mark.asyncio
async def test_extract_portrait_raises_no_face_when_all_frames_empty(service, tmp_path):
    video = tmp_path / "v.mp4"
    video.write_bytes(b"fake")
    segments = [{"start": 1.0, "end": 5.0, "text": "hi"}]

    with patch.object(service, "_extract_frame_at") as extract_mock, \
         patch.object(service, "_detect_face", return_value=None):
        extract_mock.return_value = tmp_path / "frame.jpg"
        (tmp_path / "frame.jpg").write_bytes(b"x")

        with pytest.raises(NoFaceDetectedError):
            await service.extract_portrait(
                video_path=video,
                character_name="alice",
                speech_segments=segments,
                content_id="c1",
            )
