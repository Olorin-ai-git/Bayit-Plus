"""
Detector Factory

This module implements the factory pattern for creating detector instances
based on detector type configuration.
"""

from typing import Dict, Any, Optional

from app.service.logging import get_bridge_logger
from app.service.anomaly.detectors.base import BaseDetector

logger = get_bridge_logger(__name__)

# Lazy registration flag
_detectors_registered = False


class DetectorFactory:
    """
    Factory class for creating detector instances.

    This class implements the factory pattern to create appropriate
    detector instances based on detector type.
    """

    _detector_classes: Dict[str, type] = {}

    @classmethod
    def _ensure_detectors_registered(cls) -> None:
        """Lazy registration of detectors to avoid circular imports."""
        global _detectors_registered
        if _detectors_registered:
            return
        
        # Import detectors here to avoid circular import
        from app.service.anomaly.detectors.stl_mad import STLMADDetector
        from app.service.anomaly.detectors.cusum import CUSUMDetector
        from app.service.anomaly.detectors.isoforest import IsoForestDetector
        
        # Register detectors
        cls.register('stl_mad', STLMADDetector)
        cls.register('cusum', CUSUMDetector)
        cls.register('isoforest', IsoForestDetector)
        
        _detectors_registered = True
        logger.debug("Detectors registered: stl_mad, cusum, isoforest")

    @classmethod
    def register(cls, detector_type: str, detector_class: type) -> None:
        """
        Register a detector class for a given type.

        Args:
            detector_type: Detector type identifier (e.g., 'stl_mad', 'cusum')
            detector_class: Detector class that inherits from BaseDetector
        """
        if not issubclass(detector_class, BaseDetector):
            raise ValueError(
                f"Detector class {detector_class.__name__} must inherit from BaseDetector"
            )
        cls._detector_classes[detector_type] = detector_class
        logger.info(f"Registered detector type: {detector_type} -> {detector_class.__name__}")

    @classmethod
    def create(cls, detector_type: str, params: Dict[str, Any]) -> BaseDetector:
        """
        Create a detector instance for the given type.

        Args:
            detector_type: Detector type identifier
            params: Detector configuration parameters

        Returns:
            BaseDetector instance

        Raises:
            ValueError: If detector_type is not registered
        """
        # Ensure detectors are registered (lazy registration to avoid circular imports)
        cls._ensure_detectors_registered()
        
        detector_class = cls._detector_classes.get(detector_type)
        if detector_class is None:
            available_types = ', '.join(cls._detector_classes.keys())
            raise ValueError(
                f"Unknown detector type: {detector_type}. "
                f"Available types: {available_types}"
            )

        logger.debug(f"Creating detector: {detector_type} with params: {params}")
        return detector_class(params)

    @classmethod
    def get_available_types(cls) -> list[str]:
        """
        Get list of available detector types.

        Returns:
            List of registered detector type identifiers
        """
        # Ensure detectors are registered (lazy registration to avoid circular imports)
        cls._ensure_detectors_registered()
        return list(cls._detector_classes.keys())


def get_detector_factory() -> DetectorFactory:
    """
    Get the global detector factory instance.

    Returns:
        DetectorFactory instance
    """
    return DetectorFactory

