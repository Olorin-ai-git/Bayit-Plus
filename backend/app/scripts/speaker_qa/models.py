"""Dataclasses used across the speaker_qa pipeline."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class MomentDefinition:
    """One pause-moment in the source video."""
    timestamp: float
    scene_context: str
    interaction_prompt: str
    question_count: int = 3


@dataclass(frozen=True)
class StyleRules:
    """Per-style constraints applied during answer generation."""
    max_answer_words: int
    anchor_to_scene: bool
    allow_extension: bool
    forbid_topics: list[str]


@dataclass(frozen=True)
class MemoryDemoConfig:
    """Seed data for the 3-exchange memory-chained demo."""
    seed_question: str
    followup_hint: str
    third_question_hint: str


@dataclass(frozen=True)
class SpeakerConfig:
    """Typed representation of a speaker YAML file."""
    speaker_id: str
    content_id: str
    character_name: str
    persona_mode: str
    answer_style: str
    voice_id: str
    portrait_url: str
    gcs_output_prefix: str
    manifest_path: str
    persona_prompt: str
    style_rules: StyleRules
    moments: list[MomentDefinition]
    memory_demo: MemoryDemoConfig


@dataclass(frozen=True)
class DraftQuestion:
    """A generated question, pre-answer."""
    moment_timestamp: Optional[float]  # None for memory_demo questions
    index_in_moment: int  # 0,1,2 within the moment, or 0,1,2 within memory_demo
    text: str
    is_memory_demo: bool = False


@dataclass(frozen=True)
class CallbackAnnotation:
    """Memory callback metadata for a memory_demo answer."""
    phrase: str
    references_exchange: int


@dataclass(frozen=True)
class DraftAnswer:
    """A generated answer for a question."""
    question: DraftQuestion
    response_text: str
    callback: Optional[CallbackAnnotation] = None  # non-null for memory_demo exch 2+3


@dataclass(frozen=True)
class AssetResult:
    """Generated audio + video URLs for a Q&A pair."""
    answer: DraftAnswer
    audio_url: str
    video_url: str
    duration: float
    content_hash: str
