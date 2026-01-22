"""
CV Service
Business logic for CV processing, analysis, and generation
"""

import logging
from typing import Optional
from datetime import datetime
from fastapi import UploadFile

from app.models import CV, CVAnalysis
from app.services.ai_agent_service import AIAgentService
from app.services.storage_service import StorageService
from app.services.cv_text_extraction import extract_text
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CVService:
    """Service for CV operations"""

    def __init__(self):
        self.ai_agent = AIAgentService()
        self.storage = StorageService()

    async def upload_and_analyze(
        self,
        file: UploadFile,
        user_id: str,
        language: str = "en"
    ) -> CV:
        """
        Upload CV file and trigger analysis

        Args:
            file: Uploaded CV file
            user_id: User ID
            language: CV language

        Returns:
            Created CV document
        """
        logger.info(f"Uploading CV for user {user_id}", extra={
            "filename": file.filename,
            "content_type": file.content_type,
        })

        allowed_formats = ["pdf", "docx", "doc", "txt"]
        file_ext = file.filename.split(".")[-1].lower()

        if file_ext not in allowed_formats:
            raise ValueError(f"Unsupported file format: {file_ext}")

        content = await file.read()
        file_size = len(content)

        extracted_text = await extract_text(content, file_ext)

        storage_filename = f"cvs/{user_id}/{datetime.utcnow().timestamp()}_{file.filename}"
        storage_url = await self.storage.upload_file(
            content,
            storage_filename,
            content_type=file.content_type or "application/octet-stream"
        )

        cv = CV(
            user_id=user_id,
            filename=storage_filename,
            original_filename=file.filename,
            file_format=file_ext,
            file_size_bytes=file_size,
            storage_url=storage_url,
            extracted_text=extracted_text,
            status="processing",
            language=language,
        )

        await cv.save()

        logger.info(f"CV uploaded successfully", extra={"cv_id": str(cv.id)})

        try:
            await self._analyze_cv(cv)
        except Exception as e:
            logger.error(f"CV analysis failed: {e}", exc_info=True)
            cv.status = "failed"
            cv.processing_error = str(e)
            await cv.save()

        return cv

    async def _analyze_cv(self, cv: CV):
        """Analyze CV using Olorin AI Agent"""

        start_time = datetime.utcnow()

        logger.info(f"Analyzing CV {cv.id}")

        analysis_result = await self.ai_agent.analyze_cv(
            cv.extracted_text,
            language=cv.language
        )

        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        analysis = CVAnalysis(
            cv_id=str(cv.id),
            user_id=cv.user_id,
            skills=analysis_result.get("skills", []),
            experience_years=analysis_result.get("experience_years"),
            education_level=analysis_result.get("education_level"),
            work_history=analysis_result.get("work_history", []),
            education=analysis_result.get("education", []),
            certifications=analysis_result.get("certifications", []),
            completeness_score=analysis_result.get("completeness_score"),
            ats_score=analysis_result.get("ats_score"),
            recommendations=analysis_result.get("recommendations", []),
            missing_sections=analysis_result.get("missing_sections", []),
            ai_model=self.ai_agent.model,
            processing_time_ms=processing_time,
        )

        await analysis.save()

        cv.status = "completed"
        cv.analysis_id = str(analysis.id)
        cv.processed_at = datetime.utcnow()
        cv.structured_data = analysis_result
        await cv.save()

        logger.info(f"CV analysis completed", extra={
            "cv_id": str(cv.id),
            "analysis_id": str(analysis.id),
            "processing_time_ms": processing_time,
        })

    async def get_cv(self, cv_id: str, user_id: str) -> Optional[CV]:
        """Get CV by ID with ownership verification"""

        cv = await CV.get(cv_id)

        if not cv:
            return None

        if cv.user_id != user_id:
            raise PermissionError("Access denied")

        return cv

    async def get_analysis(self, cv_id: str, user_id: str) -> Optional[CVAnalysis]:
        """Get analysis for CV"""

        cv = await self.get_cv(cv_id, user_id)

        if not cv or not cv.analysis_id:
            return None

        analysis = await CVAnalysis.get(cv.analysis_id)

        return analysis

    async def generate_cv(
        self,
        user_data: dict,
        user_id: str,
        template: str = "professional",
        language: str = "en"
    ) -> CV:
        """Generate new CV from user data"""

        logger.info(f"Generating CV for user {user_id}", extra={
            "template": template,
            "language": language,
        })

        cv_content = await self.ai_agent.generate_cv_content(
            user_data,
            template=template,
            language=language
        )

        storage_filename = f"cvs/{user_id}/generated_{datetime.utcnow().timestamp()}.txt"
        storage_url = await self.storage.upload_text(
            cv_content,
            storage_filename
        )

        cv = CV(
            user_id=user_id,
            filename=storage_filename,
            original_filename=f"Generated_CV_{template}.txt",
            file_format="txt",
            file_size_bytes=len(cv_content.encode("utf-8")),
            storage_url=storage_url,
            extracted_text=cv_content,
            status="completed",
            template=template,
            language=language,
        )

        await cv.save()

        logger.info(f"CV generated successfully", extra={"cv_id": str(cv.id)})

        return cv
