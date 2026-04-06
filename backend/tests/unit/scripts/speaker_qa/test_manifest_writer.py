"""Tests for manifest writer — merges assets into portal-demo manifest JSON."""

import json
import tempfile
from pathlib import Path

import pytest

from app.scripts.speaker_qa.manifest_writer import write_manifest
from app.scripts.speaker_qa.models import (
    AssetResult, CallbackAnnotation, DraftAnswer, DraftQuestion,
    MemoryDemoConfig, MomentDefinition, SpeakerConfig, StyleRules,
)


def _cfg(manifest_path: str) -> SpeakerConfig:
    return SpeakerConfig(
        speaker_id="jobs", content_id="c",
        character_name="Steve Jobs", persona_mode="speaker",
        answer_style="themed_riff", voice_id="v", portrait_url="http://p",
        gcs_output_prefix="g/", manifest_path=manifest_path,
        persona_prompt="p",
        style_rules=StyleRules(max_answer_words=90, anchor_to_scene=True, allow_extension=True, forbid_topics=[]),
        moments=[MomentDefinition(timestamp=10.0, scene_context="sc", interaction_prompt="ip")],
        memory_demo=MemoryDemoConfig(seed_question="q1", followup_hint="h", third_question_hint="t"),
    )


def _asset(text: str, ts, is_memory: bool = False, cb=None) -> AssetResult:
    q = DraftQuestion(moment_timestamp=ts, index_in_moment=0, text=text, is_memory_demo=is_memory)
    a = DraftAnswer(question=q, response_text=f"answer-{text}", callback=cb)
    return AssetResult(answer=a, audio_url=f"https://g/{text}.mp3", video_url=f"https://g/{text}.mp4", duration=5.5, content_hash="abc")


def test_populates_moment_questions_from_assets():
    existing_manifest = {
        "content_id": "c", "film_title": "Steve Jobs — Stanford 2005",
        "film_url": "http://f", "features": ["ask-speaker", "memory"],
        "moments": [{"timestamp": 10.0, "character": "Steve Jobs", "character_image": "http://p", "scene_context": "sc", "questions": []}],
    }
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "manifest.json"
        path.write_text(json.dumps(existing_manifest))
        assets = [_asset("q1", 10.0), _asset("q2", 10.0), _asset("q3", 10.0)]
        write_manifest(_cfg(str(path)), assets, repo_root=td + "/")
        result = json.loads(path.read_text())
    assert len(result["moments"][0]["questions"]) == 3
    assert result["moments"][0]["questions"][0]["text"] == "q1"
    assert result["moments"][0]["questions"][0]["response_text"] == "answer-q1"
    assert result["moments"][0]["questions"][0]["video_url"] == "https://g/q1.mp4"


def test_adds_memory_demo_top_level_field():
    existing_manifest = {
        "content_id": "c", "film_title": "X", "film_url": "f", "features": [],
        "moments": [{"timestamp": 10.0, "character": "Steve Jobs", "character_image": "http://p", "scene_context": "sc", "questions": []}],
    }
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "manifest.json"
        path.write_text(json.dumps(existing_manifest))
        assets = [
            _asset("mq1", None, is_memory=True),
            _asset("mq2", None, is_memory=True, cb=CallbackAnnotation(phrase="answer-mq1", references_exchange=0)),
            _asset("mq3", None, is_memory=True, cb=CallbackAnnotation(phrase="answer-mq1", references_exchange=0)),
        ]
        write_manifest(_cfg(str(path)), assets, repo_root=td + "/")
        result = json.loads(path.read_text())
    assert "memory_demo" in result
    assert result["memory_demo"]["character"] == "Steve Jobs"
    assert len(result["memory_demo"]["exchanges"]) == 3
    assert result["memory_demo"]["exchanges"][0]["callback"] is None
    assert result["memory_demo"]["exchanges"][1]["callback"]["phrase"] == "answer-mq1"
    assert result["memory_demo"]["exchanges"][1]["callback"]["references_exchange"] == 0


def test_preserves_existing_manifest_fields():
    existing = {
        "content_id": "c", "film_title": "X", "film_url": "f",
        "features": ["a", "b"], "extra_field": "keep me",
        "moments": [{"timestamp": 10.0, "character": "Steve Jobs", "character_image": "http://p", "scene_context": "sc", "questions": []}],
    }
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "manifest.json"
        path.write_text(json.dumps(existing))
        write_manifest(_cfg(str(path)), [_asset("q", 10.0)], repo_root=td + "/")
        result = json.loads(path.read_text())
    assert result["extra_field"] == "keep me"
    assert result["features"] == ["a", "b"]
