"""AI-powered commercial detection and removal."""
import json
import logging
import re
from typing import Tuple

from anthropic import AsyncAnthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


async def remove_commercials(transcript: str) -> Tuple[str, list]:
    """
    Detect and remove commercial segments from podcast transcript using AI.

    Args:
        transcript: Full transcript text

    Returns:
        Tuple of (cleaned transcript without commercials, list of removed commercial texts)

    Note:
        Uses Claude API to intelligently identify and remove commercial breaks,
        advertisements, sponsor messages, and promotional content.
    """
    logger.info("Analyzing transcript for commercial segments...")

    # Initialize Claude client
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Prompt Claude to identify commercial segments
    prompt = f"""You are analyzing a podcast transcript to identify and remove commercial segments.

Please analyze the following transcript and identify ALL commercial segments including:
- Advertisements (e.g., Burlington, FanDuel, etc.)
- Sponsor messages
- Promotional content
- Product placements
- Any content that is clearly a commercial break

For each commercial segment you identify, provide the EXACT text from the transcript.

Then, provide the CLEANED transcript with all commercial segments removed.

Format your response as JSON with this structure:
{{
  "commercials": [
    {{"text": "exact commercial text here", "type": "advertisement"}},
    {{"text": "another commercial", "type": "sponsor message"}}
  ],
  "cleaned_transcript": "the full transcript with all commercials removed"
}}

Transcript to analyze:
{transcript}

Remember: Only identify actual commercials/ads. Do NOT remove:
- Host introductions
- Episode content
- Guest introductions
- Transition phrases

Respond ONLY with valid JSON, no other text."""

    try:
        # Call Claude API
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract response text
        response_text = response.content[0].text

        # Parse JSON response - extract JSON from response if embedded in text
        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            json_text = json_match.group(0)
        else:
            json_text = response_text

        result = json.loads(json_text)

        cleaned_transcript = result.get("cleaned_transcript", transcript)
        commercials = result.get("commercials", [])

        logger.info(f"[OK] Detected {len(commercials)} commercial segment(s)")
        for i, comm in enumerate(commercials, 1):
            logger.info(
                f"  Commercial {i}: {comm.get('type', 'unknown')} - {len(comm.get('text', ''))} chars"
            )

        return cleaned_transcript, [c.get("text", "") for c in commercials]

    except Exception as e:
        logger.warning(
            f"[WARN] Commercial detection failed: {e}. Proceeding with full transcript."
        )
        # If commercial detection fails, return original transcript
        return transcript, []
