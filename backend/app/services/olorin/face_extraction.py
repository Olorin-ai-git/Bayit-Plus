"""Face portrait extraction for training video characters.

Strategy:
1. Pick the timestamp at the midpoint of the character's longest speech segment.
2. Use ffmpeg to extract a single frame at that timestamp.
3. Run OpenCV YuNet (cv2.FaceDetectorYN) on the frame.
4. If a face is found, crop with padding, upload to GCS, return URL.
5. If no face found, try up to MAX_FALLBACK_ATTEMPTS other candidate frames.
6. If still no face, raise NoFaceDetectedError — caller provides manual upload UI.

YuNet is a modern ONNX-based face detector built into OpenCV's contrib
module. The model file lives at
app/services/olorin/models/face_detection_yunet_2023mar.onnx (230KB,
Apache 2.0, opencv_zoo).
"""
import asyncio
import logging
from pathlib import Path
from typing import List, Optional

import cv2

from app.core.storage import StorageService

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = (
    Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"
)


class FaceExtractionError(Exception):
    """Generic face extraction failure (ffmpeg, IO, model load, etc.)."""


class NoFaceDetectedError(FaceExtractionError):
    """YuNet ran successfully but found no face in any candidate frame."""


class FaceExtractionService:
    MAX_FALLBACK_ATTEMPTS = 5
    CROP_PADDING_RATIO = 0.3
    MIN_CONFIDENCE = 0.6
    NMS_THRESHOLD = 0.3
    DETECTOR_INPUT_SIZE = (320, 320)

    def __init__(
        self,
        storage_service: StorageService,
        model_path: Optional[Path] = None,
    ) -> None:
        self._storage = storage_service
        self._model_path = model_path or DEFAULT_MODEL_PATH
        self._detector: Optional[cv2.FaceDetectorYN] = None

    def _get_detector(self) -> cv2.FaceDetectorYN:
        """Lazy-init the YuNet detector on first use."""
        if self._detector is None:
            if not self._model_path.exists():
                raise FaceExtractionError(
                    f"YuNet model file not found at {self._model_path}. "
                    "Ensure Task 4 committed the ONNX model."
                )
            self._detector = cv2.FaceDetectorYN.create(
                model=str(self._model_path),
                config="",
                input_size=self.DETECTOR_INPUT_SIZE,
                score_threshold=self.MIN_CONFIDENCE,
                nms_threshold=self.NMS_THRESHOLD,
                top_k=5000,
            )
        return self._detector

    async def extract_portrait(
        self,
        *,
        video_path: Path,
        character_name: str,
        speech_segments: List[dict],
        content_id: str,
    ) -> str:
        """Extract one portrait for a character and upload to GCS.

        Returns the GCS URL. Raises NoFaceDetectedError if no candidate
        frame contains a face.
        """
        if not speech_segments:
            raise FaceExtractionError("no speech segments for character")

        candidates = self._rank_candidate_timestamps(speech_segments)
        work_dir = Path(f"/tmp/face_extract_{content_id}_{character_name}")
        work_dir.mkdir(parents=True, exist_ok=True)

        for idx, ts in enumerate(candidates[: self.MAX_FALLBACK_ATTEMPTS]):
            frame_path = work_dir / f"frame_{idx}.jpg"
            try:
                await self._extract_frame_at(video_path, ts, frame_path)
            except FaceExtractionError as e:
                logger.warning("ffmpeg frame extract failed at %.2fs: %s", ts, e)
                continue

            crop = self._detect_face(frame_path)
            if crop is None:
                logger.debug("no face at %.2fs for %s", ts, character_name)
                continue

            cropped_path = work_dir / f"portrait_{idx}.jpg"
            cv2.imwrite(str(cropped_path), crop)
            remote_path = f"training-portraits/{content_id}/{character_name}.jpg"
            url = await self._storage.upload_file(
                local_path=str(cropped_path),
                remote_path=remote_path,
            )
            logger.info(
                "extracted portrait for %s at %.2fs -> %s",
                character_name, ts, url,
            )
            return url

        raise NoFaceDetectedError(
            f"no face detected in {self.MAX_FALLBACK_ATTEMPTS} candidate frames "
            f"for character '{character_name}'"
        )

    def _pick_best_speech_timestamp(self, segments: List[dict]) -> float:
        if not segments:
            raise FaceExtractionError("no speech segments")
        longest = max(segments, key=lambda s: s["end"] - s["start"])
        return (longest["start"] + longest["end"]) / 2

    def _rank_candidate_timestamps(self, segments: List[dict]) -> List[float]:
        ranked = sorted(segments, key=lambda s: s["end"] - s["start"], reverse=True)
        return [(s["start"] + s["end"]) / 2 for s in ranked]

    async def _extract_frame_at(
        self, video_path: Path, timestamp: float, output: Path
    ) -> Path:
        cmd = (
            "ffmpeg", "-y",
            "-ss", f"{timestamp}",
            "-i", str(video_path),
            "-frames:v", "1",
            "-q:v", "2",
            str(output),
        )
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0 or not output.exists():
            raise FaceExtractionError(
                f"ffmpeg failed: {stderr.decode(errors='ignore')[:200]}"
            )
        return output

    def _detect_face(self, frame_path: Path):
        """Return cropped BGR face image, or None if no face detected.

        cv2.FaceDetectorYN.detect(image) returns (retval, faces) where
        `faces` is either None or a 2D numpy array of shape (N, 15):
        columns are [x, y, w, h, lx1, ly1, ..., lx5, ly5, confidence].
        Results are already sorted by confidence.
        """
        image = cv2.imread(str(frame_path))
        if image is None:
            return None
        h, w = image.shape[:2]
        detector = self._get_detector()
        detector.setInputSize((w, h))
        _, faces = detector.detect(image)
        if faces is None or len(faces) == 0:
            return None
        best = faces[0]
        fx, fy, fw, fh = float(best[0]), float(best[1]), float(best[2]), float(best[3])
        pad_w = fw * self.CROP_PADDING_RATIO
        pad_h = fh * self.CROP_PADDING_RATIO
        x1 = max(0, int(fx - pad_w))
        y1 = max(0, int(fy - pad_h))
        x2 = min(w, int(fx + fw + pad_w))
        y2 = min(h, int(fy + fh + pad_h))
        return image[y1:y2, x1:x2]
