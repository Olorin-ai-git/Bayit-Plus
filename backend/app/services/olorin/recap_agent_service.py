"""
Recap Agent Service for Olorin.ai Platform

Real-time summaries for late-joiners to live broadcasts.
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from app.core.config import settings
from app.models.content_embedding import (
    RecapSession,
    TranscriptSegment,
    RecapEntry,
)

logger = logging.getLogger(__name__)

# Try to import Claude for summarization
try:
    from anthropic import AsyncAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    logger.warning("Anthropic Claude not available for recap agent")


class RecapAgentService:
    """
    Service for generating real-time recaps of live broadcasts.

    Features:
    - Rolling transcript buffer (configurable window)
    - Multi-language summaries
    - Key points extraction
    - Late-joiner catch-up summaries
    """

    def __init__(self):
        """Initialize recap agent service."""
        self._claude_client: Optional[AsyncAnthropic] = None

    async def _get_claude_client(self) -> Optional[AsyncAnthropic]:
        """Get or create Claude client."""
        if not self._claude_client and CLAUDE_AVAILABLE and settings.ANTHROPIC_API_KEY:
            self._claude_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._claude_client

    async def create_session(
        self,
        partner_id: Optional[str] = None,
        channel_id: Optional[str] = None,
        stream_url: Optional[str] = None,
    ) -> RecapSession:
        """
        Create a new recap session.

        Args:
            partner_id: Partner identifier
            channel_id: Live channel being watched
            stream_url: Stream URL

        Returns:
            Created session document
        """
        session_id = f"recap_{uuid.uuid4().hex[:12]}"

        session = RecapSession(
            session_id=session_id,
            partner_id=partner_id,
            channel_id=channel_id,
            stream_url=stream_url,
        )

        await session.insert()
        logger.info(f"Created recap session: {session_id}")

        return session

    async def add_transcript_segment(
        self,
        session_id: str,
        text: str,
        timestamp: float,
        speaker: Optional[str] = None,
        language: str = "he",
        confidence: Optional[float] = None,
    ) -> Optional[RecapSession]:
        """
        Add a transcript segment to the session.

        Args:
            session_id: Session identifier
            text: Transcript text
            timestamp: Seconds from session start
            speaker: Optional speaker identifier
            language: Language code
            confidence: STT confidence score

        Returns:
            Updated session or None if not found
        """
        session = await RecapSession.find_one(
            RecapSession.session_id == session_id
        )
        if not session:
            return None

        segment = {
            "text": text,
            "timestamp": timestamp,
            "speaker": speaker,
            "language": language,
            "confidence": confidence,
        }

        session.transcript_segments.append(segment)
        session.total_duration_seconds = max(session.total_duration_seconds, timestamp)
        session.last_updated_at = datetime.now(timezone.utc)

        await session.save()
        return session

    async def generate_recap(
        self,
        session_id: str,
        window_minutes: Optional[int] = None,
        target_language: str = "en",
    ) -> Optional[dict]:
        """
        Generate a catch-up summary for the session.

        Args:
            session_id: Session identifier
            window_minutes: Minutes to summarize (None = entire session)
            target_language: Language for summary

        Returns:
            Recap dict with summary and key points
        """
        session = await RecapSession.find_one(
            RecapSession.session_id == session_id
        )
        if not session:
            return None

        if not session.transcript_segments:
            return {
                "summary": "No transcript available yet.",
                "key_points": [],
                "window_start_seconds": 0,
                "window_end_seconds": 0,
                "tokens_used": 0,
            }

        # Determine time window
        if window_minutes is None:
            window_minutes = settings.RECAP_WINDOW_DEFAULT_MINUTES

        window_seconds = window_minutes * 60
        current_time = session.total_duration_seconds

        if window_seconds > 0:
            window_start = max(0, current_time - window_seconds)
        else:
            window_start = 0

        # Filter segments in window
        segments_in_window = [
            s for s in session.transcript_segments
            if s.get("timestamp", 0) >= window_start
        ]

        if not segments_in_window:
            return {
                "summary": "No recent content in the specified time window.",
                "key_points": [],
                "window_start_seconds": window_start,
                "window_end_seconds": current_time,
                "tokens_used": 0,
            }

        # Build transcript text
        transcript_text = self._build_transcript_text(segments_in_window)

        # Generate summary with Claude
        claude = await self._get_claude_client()
        if not claude:
            return {
                "summary": "Summary generation unavailable.",
                "key_points": [],
                "window_start_seconds": window_start,
                "window_end_seconds": current_time,
                "tokens_used": 0,
            }

        try:
            summary, key_points, tokens_used = await self._generate_summary(
                transcript_text=transcript_text,
                target_language=target_language,
                window_minutes=window_minutes,
            )

            # Store recap in session
            recap_entry = {
                "summary": summary,
                "key_points": key_points,
                "window_start_seconds": window_start,
                "window_end_seconds": current_time,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "tokens_used": tokens_used,
            }
            session.recaps.append(recap_entry)
            await session.save()

            return {
                "summary": summary,
                "key_points": key_points,
                "window_start_seconds": window_start,
                "window_end_seconds": current_time,
                "tokens_used": tokens_used,
            }

        except Exception as e:
            logger.error(f"Failed to generate recap: {e}")
            return {
                "summary": f"Summary generation failed: {str(e)}",
                "key_points": [],
                "window_start_seconds": window_start,
                "window_end_seconds": current_time,
                "tokens_used": 0,
            }

    async def get_session(self, session_id: str) -> Optional[RecapSession]:
        """Get a recap session by ID."""
        return await RecapSession.find_one(
            RecapSession.session_id == session_id
        )

    async def end_session(self, session_id: str) -> Optional[RecapSession]:
        """End a recap session."""
        session = await RecapSession.find_one(
            RecapSession.session_id == session_id
        )
        if not session:
            return None

        session.status = "ended"
        session.ended_at = datetime.now(timezone.utc)
        await session.save()

        logger.info(f"Ended recap session: {session_id}")
        return session

    async def get_active_sessions(
        self,
        partner_id: Optional[str] = None,
    ) -> List[RecapSession]:
        """Get all active sessions, optionally filtered by partner."""
        query = {"status": "active"}
        if partner_id:
            query["partner_id"] = partner_id

        return await RecapSession.find(query).to_list()

    def _build_transcript_text(self, segments: List[dict]) -> str:
        """Build transcript text from segments."""
        lines = []
        for segment in segments:
            timestamp = segment.get("timestamp", 0)
            speaker = segment.get("speaker")
            text = segment.get("text", "")

            # Format timestamp
            minutes = int(timestamp // 60)
            seconds = int(timestamp % 60)
            time_str = f"[{minutes:02d}:{seconds:02d}]"

            if speaker:
                lines.append(f"{time_str} {speaker}: {text}")
            else:
                lines.append(f"{time_str} {text}")

        return "\n".join(lines)

    async def _generate_summary(
        self,
        transcript_text: str,
        target_language: str,
        window_minutes: int,
    ) -> tuple[str, List[str], int]:
        """Generate summary using Claude."""
        claude = await self._get_claude_client()
        if not claude:
            raise RuntimeError("Claude client not available")

        language_names = {
            "he": "Hebrew",
            "en": "English",
            "es": "Spanish",
        }
        target_name = language_names.get(target_language, target_language)

        prompt = f"""You are summarizing the last {window_minutes} minutes of a live broadcast for someone who just joined.

Transcript:
{transcript_text}

Please provide:
1. A concise summary (2-3 sentences) of what has been discussed/shown
2. 3-5 key points that a late-joiner needs to know

Respond in {target_name} with this JSON format:
{{
  "summary": "Your summary here",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}}

Focus on:
- Main topics discussed
- Important announcements or revelations
- Current context (what's happening now)
- Any ongoing storylines or debates"""

        response = await claude.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.RECAP_SUMMARY_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Parse response
        import json
        import re

        try:
            content = response.content[0].text
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                return (
                    data.get("summary", "Summary unavailable"),
                    data.get("key_points", []),
                    tokens_used,
                )
        except json.JSONDecodeError:
            pass

        # Fallback: return raw text as summary
        return response.content[0].text, [], tokens_used


# Singleton instance
recap_agent_service = RecapAgentService()
