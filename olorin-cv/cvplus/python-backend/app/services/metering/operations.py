"""
Metering Operations
Enum definitions for billable operations in CVPlus
"""

from enum import Enum


class MeterableOperation(str, Enum):
    """Billable operations in CVPlus"""

    CV_UPLOAD = "cv_upload"
    CV_ANALYSIS = "cv_analysis"
    CV_GENERATION = "cv_generation"
    PROFILE_CREATION = "profile_creation"
    QR_CODE_GENERATION = "qr_code_generation"
    AI_API_CALL = "ai_api_call"
    STORAGE_UPLOAD = "storage_upload"
    STORAGE_DOWNLOAD = "storage_download"
