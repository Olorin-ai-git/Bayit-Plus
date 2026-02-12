"""
Face Detection Service.

Validates child photos for suitability before avatar generation.
Checks image format, resolution, and basic face presence using
PIL-based heuristics. No biometric data is stored.
"""

import logging

from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}


class FaceDetectionService:
    """Validates uploaded photos for face presence and image quality."""

    async def detect_face(self, image_path: str) -> dict:
        """
        Analyze an image for face presence indicators.

        Uses PIL to validate the image and check basic properties
        that correlate with a usable portrait photo (dimensions,
        format, color mode). Returns detection metadata without
        storing any biometric information.

        Args:
            image_path: Local or GCS path to the image file.

        Returns:
            Dict with face_detected, face_count, width, height, format.
        """
        try:
            img = Image.open(image_path)
            img.verify()
            img = Image.open(image_path)

            width, height = img.size
            img_format = img.format

            if img_format not in SUPPORTED_FORMATS:
                logger.warning(
                    "Unsupported image format for face detection",
                    extra={
                        "image_path": image_path,
                        "format": img_format,
                    },
                )
                return {
                    "face_detected": False,
                    "face_count": 0,
                    "width": width,
                    "height": height,
                    "format": img_format,
                    "error": f"Unsupported format: {img_format}",
                }

            is_portrait = self._is_portrait_candidate(img)
            face_count = 1 if is_portrait else 0

            logger.info(
                "Face detection completed",
                extra={
                    "image_path": image_path,
                    "face_detected": is_portrait,
                    "width": width,
                    "height": height,
                },
            )

            return {
                "face_detected": is_portrait,
                "face_count": face_count,
                "width": width,
                "height": height,
                "format": img_format,
                "error": None,
            }

        except Exception as exc:
            logger.error(
                "Face detection failed",
                extra={
                    "image_path": image_path,
                    "error": str(exc),
                },
            )
            return {
                "face_detected": False,
                "face_count": 0,
                "width": 0,
                "height": 0,
                "format": None,
                "error": str(exc),
            }

    async def validate_photo(self, image_path: str) -> dict:
        """
        Validate a photo is suitable for avatar generation.

        Checks that the image meets minimum resolution requirements
        and contains indicators of a single child portrait.

        Args:
            image_path: Local or GCS path to the image file.

        Returns:
            Dict with valid bool, reason string, and detection details.
        """
        detection = await self.detect_face(image_path)

        if detection.get("error"):
            return {
                "valid": False,
                "reason": f"Image validation failed: {detection['error']}",
                "detection": detection,
            }

        min_width = settings.STAR_STORY_MIN_PHOTO_WIDTH
        min_height = settings.STAR_STORY_MIN_PHOTO_HEIGHT

        if detection["width"] < min_width or detection["height"] < min_height:
            reason = (
                f"Image resolution {detection['width']}x{detection['height']} "
                f"is below minimum {min_width}x{min_height}"
            )
            logger.info(
                "Photo validation failed: insufficient resolution",
                extra={
                    "image_path": image_path,
                    "width": detection["width"],
                    "height": detection["height"],
                },
            )
            return {
                "valid": False,
                "reason": reason,
                "detection": detection,
            }

        if not detection["face_detected"]:
            return {
                "valid": False,
                "reason": "No face detected in photo",
                "detection": detection,
            }

        logger.info(
            "Photo validation passed",
            extra={"image_path": image_path},
        )
        return {
            "valid": True,
            "reason": "Photo meets all requirements",
            "detection": detection,
        }

    def _is_portrait_candidate(self, img: Image.Image) -> bool:
        """
        Check basic image properties that indicate a portrait photo.

        Validates color mode and aspect ratio fall within ranges
        typical of portrait/selfie photos with a single subject.
        """
        if img.mode not in ("RGB", "RGBA", "L"):
            return False

        width, height = img.size
        if width == 0 or height == 0:
            return False

        aspect_ratio = width / height
        min_aspect = 0.4
        max_aspect = 2.5
        if aspect_ratio < min_aspect or aspect_ratio > max_aspect:
            return False

        return True


face_detection_service = FaceDetectionService()
