"""
Anomaly Detection Detectors

This module contains detector implementations for various anomaly detection algorithms.
"""

from app.service.anomaly.detectors.base import BaseDetector, DetectorResult
from app.service.anomaly.detectors.cusum import CUSUMDetector
from app.service.anomaly.detectors.isoforest import IsoForestDetector
from app.service.anomaly.detectors.stl_mad import STLMADDetector

# Detector registration is done lazily in detector_factory.py to avoid circular imports
# The factory will register detectors when first accessed

__all__ = [
    "BaseDetector",
    "DetectorResult",
    "STLMADDetector",
    "CUSUMDetector",
    "IsoForestDetector",
]
