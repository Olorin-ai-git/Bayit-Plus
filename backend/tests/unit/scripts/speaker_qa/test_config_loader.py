"""Tests for YAML config loading."""

import os
import tempfile
import textwrap

import pytest

from app.scripts.speaker_qa.config_loader import load_speaker_config
from app.scripts.speaker_qa.models import SpeakerConfig


VALID_YAML = textwrap.dedent("""
    speaker_id: jobs-stanford-2005
    content_id: "69d286dc1c1371035dbb14b5"
    character_name: Steve Jobs
    persona_mode: speaker
    answer_style: themed_riff
    voice_id: ${SPEAKER_VOICE_ARCHETYPE_OLDER_MALE}
    portrait_url: https://example.com/portrait.jpg
    gcs_output_prefix: demo/jobs-stanford-2005/qa/
    manifest_path: packages/portal-demo/public/content/jobs-stanford-2005/manifest.json
    persona_prompt: |
        You speak as Steve Jobs.
    style_rules:
      themed_riff:
        max_answer_words: 90
        anchor_to_scene: true
        allow_extension: true
        forbid_topics: ["politics post-2011"]
    moments:
      - timestamp: 45.0
        scene_context: "Opening"
        interaction_prompt: "Ask Steve"
        question_count: 3
      - timestamp: 180.0
        scene_context: "First story"
        interaction_prompt: "Ask about calligraphy"
    memory_demo:
      seed_question: "What defines success?"
      followup_hint: "callback to 'success'"
      third_question_hint: "over lifetime?"
""").strip()


def _write_tmp(content: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".yaml")
    os.write(fd, content.encode())
    os.close(fd)
    return path


def test_loads_valid_yaml_into_speaker_config(monkeypatch):
    monkeypatch.setenv("SPEAKER_VOICE_ARCHETYPE_OLDER_MALE", "test_voice_123")
    path = _write_tmp(VALID_YAML)
    cfg = load_speaker_config(path)
    assert isinstance(cfg, SpeakerConfig)
    assert cfg.speaker_id == "jobs-stanford-2005"
    assert cfg.content_id == "69d286dc1c1371035dbb14b5"
    assert cfg.voice_id == "test_voice_123"
    assert cfg.style_rules.max_answer_words == 90
    assert "politics post-2011" in cfg.style_rules.forbid_topics
    assert len(cfg.moments) == 2
    assert cfg.moments[0].timestamp == 45.0
    assert cfg.moments[1].question_count == 3  # default applied
    assert cfg.memory_demo.seed_question == "What defines success?"


def test_fallback_when_env_var_unset(monkeypatch):
    monkeypatch.delenv("SPEAKER_VOICE_ARCHETYPE_OLDER_MALE", raising=False)
    monkeypatch.setenv("CHARACTER_VOICE_DEFAULT", "fallback_voice_456")
    path = _write_tmp(VALID_YAML)
    cfg = load_speaker_config(path)
    assert cfg.voice_id == "fallback_voice_456"


def test_missing_required_field_raises(monkeypatch):
    monkeypatch.setenv("SPEAKER_VOICE_ARCHETYPE_OLDER_MALE", "v")
    bad = VALID_YAML.replace("content_id:", "wrong_field:")
    path = _write_tmp(bad)
    with pytest.raises(ValueError, match="content_id"):
        load_speaker_config(path)


def test_unknown_answer_style_raises(monkeypatch):
    monkeypatch.setenv("SPEAKER_VOICE_ARCHETYPE_OLDER_MALE", "v")
    bad = VALID_YAML.replace("answer_style: themed_riff", "answer_style: strict_echo")
    path = _write_tmp(bad)
    with pytest.raises(ValueError, match="strict_echo"):
        load_speaker_config(path)
