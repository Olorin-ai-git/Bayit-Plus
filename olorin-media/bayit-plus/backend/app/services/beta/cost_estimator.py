"""
Beta Cost Estimator and Tracker

Accurately calculates and tracks real API costs for Beta features.
Maps external provider costs (Google, ElevenLabs, OpenAI, Anthropic) to Beta credits.

Critical: These features use real APIs that cost real money. Users can burn through
credits quickly with long-form content (1-2 hour podcasts/streams).
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ProviderCosts:
    """
    Real-world API costs from external providers (as of 2026).

    Sources:
    - Google Cloud Speech-to-Text: https://cloud.google.com/speech-to-text/pricing
    - Google Cloud Text-to-Speech: https://cloud.google.com/text-to-speech/pricing
    - Google Cloud Translate: https://cloud.google.com/translate/pricing
    - ElevenLabs: https://elevenlabs.io/pricing
    - OpenAI Whisper: https://openai.com/api/pricing
    - Anthropic Claude: https://www.anthropic.com/pricing
    """

    # Speech-to-Text (per minute of audio)
    google_stt_per_minute: float = 0.006  # Standard model: $0.006/min
    google_stt_enhanced_per_minute: float = 0.009  # Enhanced model: $0.009/min
    whisper_per_minute: float = 0.006  # OpenAI Whisper: $0.006/min
    elevenlabs_stt_per_minute: float = 0.01  # ElevenLabs Scribe: $0.01/min

    # Text-to-Speech (per 1M characters)
    google_tts_per_million_chars: float = 4.00  # Standard: $4/1M chars
    google_tts_neural_per_million_chars: float = 16.00  # Neural2: $16/1M chars
    elevenlabs_tts_per_char: float = 0.0003  # Turbo v2.5: ~$300/1M chars

    # Translation (per 1M characters)
    google_translate_per_million_chars: float = 20.00  # $20/1M chars
    claude_per_million_tokens: float = 15.00  # Claude Haiku output: $15/1M tokens
    openai_per_million_tokens: float = 0.60  # GPT-4o mini output: $0.60/1M tokens

    # Estimated characters per token (for translation)
    chars_per_token: float = 4.0


@dataclass
class CostEstimate:
    """Estimated cost for a Beta operation."""

    total_credits: int  # Total Beta credits required
    total_usd: float  # Total cost in USD
    breakdown: Dict[str, float]  # Cost breakdown by component
    duration_minutes: float  # Estimated duration
    warnings: list[str]  # Warnings about high costs


class BetaCostEstimator:
    """
    Estimates and tracks real API costs for Beta features.

    Responsibilities:
    - Calculate accurate cost estimates before operations
    - Track actual API usage during operations
    - Map real costs to Beta credits
    - Warn users about expensive operations
    """

    # Beta credits to USD exchange rate
    # 1 Beta credit = $0.01 USD (100 credits = $1)
    CREDITS_PER_DOLLAR = 100

    def __init__(self):
        self.costs = ProviderCosts()

    def estimate_live_dubbing_cost(
        self,
        duration_minutes: float,
        source_lang: str = "he",
        target_lang: str = "en",
    ) -> CostEstimate:
        """
        Estimate cost for live dubbing (STT + Translation + TTS).

        Args:
            duration_minutes: Duration in minutes
            source_lang: Source language
            target_lang: Target language

        Returns:
            CostEstimate with breakdown
        """
        # Assume average speaking: 150 words/min = ~750 chars/min
        chars_per_minute = 750

        # STT cost (using ElevenLabs Scribe for real-time)
        stt_cost = duration_minutes * self.costs.elevenlabs_stt_per_minute

        # Translation cost (using Claude for quality)
        total_chars = duration_minutes * chars_per_minute
        translation_tokens = total_chars / self.costs.chars_per_token
        translation_cost = (translation_tokens / 1_000_000) * self.costs.claude_per_million_tokens

        # TTS cost (using ElevenLabs for quality)
        tts_cost = total_chars * self.costs.elevenlabs_tts_per_char

        # Total
        total_usd = stt_cost + translation_cost + tts_cost
        total_credits = int(total_usd * self.CREDITS_PER_DOLLAR)

        # Warnings
        warnings = []
        if total_credits > 1000:
            warnings.append(
                f"⚠️ High cost: {total_credits} credits for {duration_minutes:.1f} minutes"
            )
        if duration_minutes > 60:
            warnings.append(
                f"⚠️ Long duration: {duration_minutes:.1f} minutes may consume significant credits"
            )

        return CostEstimate(
            total_credits=total_credits,
            total_usd=round(total_usd, 4),
            breakdown={
                "stt_usd": round(stt_cost, 4),
                "translation_usd": round(translation_cost, 4),
                "tts_usd": round(tts_cost, 4),
            },
            duration_minutes=duration_minutes,
            warnings=warnings,
        )

    def estimate_live_translation_cost(
        self,
        duration_minutes: float,
        source_lang: str = "he",
        target_lang: str = "en",
    ) -> CostEstimate:
        """
        Estimate cost for live translation (STT + Translation only, no TTS).

        Args:
            duration_minutes: Duration in minutes
            source_lang: Source language
            target_lang: Target language

        Returns:
            CostEstimate with breakdown
        """
        chars_per_minute = 750

        # STT cost
        stt_cost = duration_minutes * self.costs.google_stt_per_minute

        # Translation cost
        total_chars = duration_minutes * chars_per_minute
        translation_tokens = total_chars / self.costs.chars_per_token
        translation_cost = (translation_tokens / 1_000_000) * self.costs.claude_per_million_tokens

        # Total (no TTS for subtitles)
        total_usd = stt_cost + translation_cost
        total_credits = int(total_usd * self.CREDITS_PER_DOLLAR)

        warnings = []
        if total_credits > 500:
            warnings.append(
                f"⚠️ High cost: {total_credits} credits for {duration_minutes:.1f} minutes"
            )

        return CostEstimate(
            total_credits=total_credits,
            total_usd=round(total_usd, 4),
            breakdown={
                "stt_usd": round(stt_cost, 4),
                "translation_usd": round(translation_cost, 4),
            },
            duration_minutes=duration_minutes,
            warnings=warnings,
        )

    def estimate_podcast_translation_cost(
        self,
        duration_minutes: float,
        source_lang: str = "he",
        target_lang: str = "en",
    ) -> CostEstimate:
        """
        Estimate cost for podcast translation (full 8-stage pipeline).

        Pipeline: Download → Vocals Separation → STT (Whisper) → Commercial Removal →
                  Translation (Claude) → TTS (ElevenLabs) → Mix → Upload

        Args:
            duration_minutes: Podcast duration in minutes
            source_lang: Source language
            target_lang: Target language

        Returns:
            CostEstimate with detailed breakdown
        """
        chars_per_minute = 750

        # STT cost (using Whisper for accuracy)
        stt_cost = duration_minutes * self.costs.whisper_per_minute

        # Translation cost (using Claude)
        total_chars = duration_minutes * chars_per_minute
        translation_tokens = total_chars / self.costs.chars_per_token
        translation_cost = (translation_tokens / 1_000_000) * self.costs.claude_per_million_tokens

        # TTS cost (using ElevenLabs for quality)
        tts_cost = total_chars * self.costs.elevenlabs_tts_per_char

        # Vocal separation (processing cost - estimate $0.02/min)
        vocal_separation_cost = duration_minutes * 0.02

        # Commercial removal (AI processing - estimate $0.01/min)
        commercial_removal_cost = duration_minutes * 0.01

        # Total
        total_usd = (
            stt_cost
            + translation_cost
            + tts_cost
            + vocal_separation_cost
            + commercial_removal_cost
        )
        total_credits = int(total_usd * self.CREDITS_PER_DOLLAR)

        # Warnings for expensive operations
        warnings = []
        if duration_minutes > 60:
            warnings.append(
                f"⚠️ LONG PODCAST: {duration_minutes:.1f} minutes will cost {total_credits} credits"
            )
            warnings.append(
                f"💡 This is approximately ${total_usd:.2f} in API costs"
            )
        if total_credits > 2000:
            warnings.append(
                f"🚨 VERY EXPENSIVE: {total_credits} credits required. Consider shorter episodes."
            )

        return CostEstimate(
            total_credits=total_credits,
            total_usd=round(total_usd, 4),
            breakdown={
                "stt_usd": round(stt_cost, 4),
                "translation_usd": round(translation_cost, 4),
                "tts_usd": round(tts_cost, 4),
                "vocal_separation_usd": round(vocal_separation_cost, 4),
                "commercial_removal_usd": round(commercial_removal_cost, 4),
            },
            duration_minutes=duration_minutes,
            warnings=warnings,
        )

    def check_sufficient_credits(
        self,
        user_balance: int,
        estimated_cost: CostEstimate,
    ) -> tuple[bool, Optional[str]]:
        """
        Check if user has sufficient credits for operation.

        Args:
            user_balance: User's current credit balance
            estimated_cost: Estimated operation cost

        Returns:
            (sufficient, warning_message)
        """
        if user_balance < estimated_cost.total_credits:
            return (
                False,
                f"Insufficient credits: {user_balance} available, "
                f"{estimated_cost.total_credits} required "
                f"(${estimated_cost.total_usd:.2f} in API costs)",
            )

        # Warn if operation will consume >50% of balance
        if estimated_cost.total_credits > user_balance * 0.5:
            return (
                True,
                f"⚠️ This operation will consume {estimated_cost.total_credits} credits "
                f"({int(estimated_cost.total_credits / user_balance * 100)}% of your balance). "
                f"Proceed with caution.",
            )

        return (True, None)


# Singleton instance
cost_estimator = BetaCostEstimator()
