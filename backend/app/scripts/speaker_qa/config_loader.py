"""YAML → typed SpeakerConfig with validation + env-var resolution."""

import os
import re
from pathlib import Path

import yaml

from app.scripts.speaker_qa.models import (
    MemoryDemoConfig,
    MomentDefinition,
    SpeakerConfig,
    StyleRules,
)

_REQUIRED_FIELDS = [
    "speaker_id", "content_id", "character_name", "persona_mode",
    "answer_style", "voice_id", "portrait_url", "gcs_output_prefix",
    "manifest_path", "persona_prompt", "style_rules", "moments", "memory_demo",
]

_ENV_VAR_RE = re.compile(r"\$\{([A-Z_][A-Z0-9_]*)\}")


def _resolve_env_refs(value: str) -> str:
    """Replace ${VAR} with env var value; falls back to CHARACTER_VOICE_DEFAULT."""
    def repl(match: re.Match) -> str:
        var_name = match.group(1)
        resolved = os.environ.get(var_name)
        if resolved:
            return resolved
        fallback = os.environ.get("CHARACTER_VOICE_DEFAULT")
        if fallback:
            return fallback
        raise ValueError(
            f"Env var {var_name!r} unset and no CHARACTER_VOICE_DEFAULT fallback"
        )
    return _ENV_VAR_RE.sub(repl, value)


def load_speaker_config(yaml_path: str) -> SpeakerConfig:
    """Load + validate + resolve a speaker YAML file into SpeakerConfig."""
    raw = yaml.safe_load(Path(yaml_path).read_text())

    for field_name in _REQUIRED_FIELDS:
        if field_name not in raw:
            raise ValueError(f"Missing required field: {field_name!r}")

    raw["voice_id"] = _resolve_env_refs(str(raw["voice_id"]))

    style_name = raw["answer_style"]
    if style_name not in raw["style_rules"]:
        raise ValueError(
            f"answer_style {style_name!r} has no matching entry in style_rules. "
            f"Available: {list(raw['style_rules'].keys())}"
        )

    sr = raw["style_rules"][style_name]
    style_rules = StyleRules(
        max_answer_words=int(sr["max_answer_words"]),
        anchor_to_scene=bool(sr["anchor_to_scene"]),
        allow_extension=bool(sr["allow_extension"]),
        forbid_topics=list(sr.get("forbid_topics", [])),
    )

    moments = [
        MomentDefinition(
            timestamp=float(m["timestamp"]),
            scene_context=str(m["scene_context"]),
            interaction_prompt=str(m["interaction_prompt"]),
            question_count=int(m.get("question_count", 3)),
        )
        for m in raw["moments"]
    ]

    md = raw["memory_demo"]
    memory_demo = MemoryDemoConfig(
        seed_question=str(md["seed_question"]),
        followup_hint=str(md["followup_hint"]),
        third_question_hint=str(md["third_question_hint"]),
    )

    return SpeakerConfig(
        speaker_id=str(raw["speaker_id"]),
        content_id=str(raw["content_id"]),
        character_name=str(raw["character_name"]),
        persona_mode=str(raw["persona_mode"]),
        answer_style=style_name,
        voice_id=raw["voice_id"],
        portrait_url=str(raw["portrait_url"]),
        gcs_output_prefix=str(raw["gcs_output_prefix"]),
        manifest_path=str(raw["manifest_path"]),
        persona_prompt=str(raw["persona_prompt"]),
        style_rules=style_rules,
        moments=moments,
        memory_demo=memory_demo,
    )
