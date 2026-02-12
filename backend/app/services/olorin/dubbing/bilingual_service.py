"""
Bilingual Dubbing Service.

Orchestrates proficiency-aware, ratio-controlled dubbing sessions.
Manages session lifecycle and vocabulary tracking.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from app.core.config import settings
from app.models.bilingual_dubbing_session import (
    BilingualDubbingSession,
    VocabularyIntroduction,
)
from app.models.child_proficiency import ProficiencyResponse
from app.services.olorin.dubbing.code_switch_translation import (
    code_switch_translation,
)
from app.services.olorin.dubbing.ratio_controller import ratio_controller
from app.services.proficiency.assessment_service import assessment_service

logger = logging.getLogger(__name__)


class BilingualDubbingService:
    """Orchestrates bilingual dubbing sessions."""

    async def start_session(
        self,
        user_id: str,
        profile_id: str,
        content_id: str,
    ) -> BilingualDubbingSession:
        """Start a new bilingual dubbing session."""
        proficiency = await assessment_service.get_or_create_proficiency(
            user_id, profile_id
        )

        target_ratio = ratio_controller.get_target_ratio(proficiency)
        session_id = str(uuid.uuid4())

        session = BilingualDubbingSession(
            user_id=user_id,
            profile_id=profile_id,
            content_id=content_id,
            session_id=session_id,
            target_hebrew_ratio=target_ratio,
        )
        await session.insert()

        logger.info(
            "Bilingual dubbing session started",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "content_id": content_id,
                "session_id": session_id,
                "target_ratio": target_ratio,
                "level": proficiency.level.value,
            },
        )
        return session

    async def translate_segment(
        self,
        session_id: str,
        hebrew_text: str,
        timestamp_seconds: float,
    ) -> Dict:
        """Translate a segment with code-switching for a session."""
        session = await BilingualDubbingSession.find_one(
            {"session_id": session_id}
        )
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        proficiency = await assessment_service.get_or_create_proficiency(
            session.user_id, session.profile_id
        )

        known_words = ratio_controller.select_words_for_hebrew(
            proficiency,
            target_count=settings.BILINGUAL_DUBBING_VOCAB_TARGET,
        )

        result = await code_switch_translation.translate(
            hebrew_text=hebrew_text,
            known_hebrew_words=known_words,
            target_ratio=session.target_hebrew_ratio,
        )

        session.total_segments += 1
        hebrew_used = result.get("hebrew_words_used", [])
        if hebrew_used:
            session.hebrew_segments_count += 1
            for word in hebrew_used:
                session.vocabulary_introduced.append(
                    VocabularyIntroduction(
                        word=word,
                        introduced_at_seconds=timestamp_seconds,
                    )
                )
        else:
            session.english_segments_count += 1

        if session.total_segments > 0:
            session.actual_hebrew_ratio = (
                session.hebrew_segments_count / session.total_segments
            )
        await session.save()

        return result

    async def end_session(
        self,
        session_id: str,
    ) -> Optional[BilingualDubbingSession]:
        """End a bilingual dubbing session and adjust ratio."""
        session = await BilingualDubbingSession.find_one(
            {"session_id": session_id}
        )
        if not session:
            return None

        session.ended_at = datetime.now(timezone.utc)
        duration = (session.ended_at - session.started_at).total_seconds()
        session.session_duration_seconds = duration

        proficiency = await assessment_service.get_or_create_proficiency(
            session.user_id, session.profile_id
        )

        ratio_controller.adjust_ratio(
            current_ratio=session.target_hebrew_ratio,
            proficiency=proficiency,
            session_accuracy=session.actual_hebrew_ratio,
        )

        await session.save()

        logger.info(
            "Bilingual dubbing session ended",
            extra={
                "session_id": session_id,
                "duration": duration,
                "actual_ratio": session.actual_hebrew_ratio,
                "segments": session.total_segments,
            },
        )
        return session

    async def get_proficiency_status(
        self,
        user_id: str,
        profile_id: str,
    ) -> ProficiencyResponse:
        """Get current proficiency status for bilingual dubbing."""
        prof = await assessment_service.get_or_create_proficiency(
            user_id, profile_id
        )
        return ProficiencyResponse(
            level=prof.level.value,
            overall_score=prof.overall_score,
            hebrew_ratio=prof.hebrew_ratio,
            total_words_learned=prof.total_words_learned,
            vocabulary_known_count=len(prof.vocabulary_known),
            vocabulary_learning_count=len(prof.vocabulary_learning),
        )


bilingual_dubbing_service = BilingualDubbingService()
