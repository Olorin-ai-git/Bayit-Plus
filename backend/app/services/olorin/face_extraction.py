"""Face portrait extraction for training video characters.

Picks the midpoint of the longest speech segment, extracts a frame via
ffmpeg, runs YuNet face detection, crops with padding, uploads to GCS.
Falls back through MAX_FALLBACK_ATTEMPTS candidates; raises
NoFaceDetectedError if none yield a face.

Model: app/services/olorin/models/face_detection_yunet_2023mar.onnx
(230 KB, Apache 2.0, opencv_zoo).
"""
import asyncio
import logging
import re
import tempfile
from pathlib import Path
from typing import List, Optional

import cv2

from app.core.storage import StorageService

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = (
    Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"
)

_UNSAFE_NAME_RE = re.compile(r"[^A-Za-z0-9_\-]")


def _sanitize_name(name: str) -> str:
    """Replace anything outside [A-Za-z0-9_-] with underscores.

    Prevents path-traversal when character names come from LLM output.
    """
    cleaned = _UNSAFE_NAME_RE.sub("_", name).strip("_")
    return cleaned or "unknown"


class FaceExtractionError(Exception):
    """Generic face extraction failure (ffmpeg, IO, model load, etc.)."""


class NoFaceDetectedError(FaceExtractionError):
    """YuNet ran successfully but found no face in any candidate frame."""


class FaceExtractionService:
    # Bumped from 5 → 20 for training screen-share content where the
    # instructor's face is only visible in a minority of frames. The
    # ranker orders candidates by segment length, but a single 9-minute
    # tutorial that is 70% IDE screen-share will only surface a face in
    # ~30% of sampled frames. 20 attempts gives a ~99.97% probability
    # of hitting at least one face-visible frame in that scenario
    # (vs. ~83% at 5 attempts).
    MAX_FALLBACK_ATTEMPTS = 20
    CROP_PADDING_RATIO = 0.3
    MIN_CONFIDENCE = 0.6
    NMS_THRESHOLD = 0.3
    DETECTOR_INPUT_SIZE = (320, 320)

    def __init__(
        self,
        storage_service: StorageService,
        model_path: Optional[Path] = None,
    ) -> None:
        self._gcs = storage_service
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
        safe_name = _sanitize_name(character_name)
        tried_timestamps: List[float] = []

        with tempfile.TemporaryDirectory(
            prefix=f"face_extract_{content_id}_"
        ) as work_dir_str:
            work_dir = Path(work_dir_str)

            for idx, ts in enumerate(candidates[: self.MAX_FALLBACK_ATTEMPTS]):
                tried_timestamps.append(ts)
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
                if not cv2.imwrite(str(cropped_path), crop):
                    raise FaceExtractionError(
                        f"cv2.imwrite failed writing to {cropped_path}"
                    )
                url = await self._gcs.upload_file(
                    local_path=str(cropped_path),
                    remote_path=f"training-portraits/{content_id}/{safe_name}.jpg",
                )
                logger.info("extracted portrait for %s at %.2fs -> %s", character_name, ts, url)
                return url

        raise NoFaceDetectedError(
            f"no face detected for character {character_name!r} in content "
            f"{content_id!r} (tried timestamps: {tried_timestamps})"
        )

    def _pick_best_speech_timestamp(self, segments: List[dict]) -> float:
        """Backward-compat delegator; production code uses _rank_candidate_timestamps."""
        return self._rank_candidate_timestamps(segments)[0]

    def _rank_candidate_timestamps(self, segments: List[dict]) -> List[float]:
        if not segments:
            raise FaceExtractionError("no speech segments")
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

        YuNet returns (retval, faces): faces is None or shape (N, 15)
        [x, y, w, h, lx1, ly1, ..., lx5, ly5, confidence], by confidence.
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
        if x1 >= x2 or y1 >= y2:
            logger.warning("degenerate face crop (box=%s): skipping", best[:4].tolist())
            return None
        return image[y1:y2, x1:x2]
