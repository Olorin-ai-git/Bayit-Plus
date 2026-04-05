"""Speaker Q&A Pipeline CLI.

Usage (from backend/ directory):
    poetry run python -m app.scripts.speaker_qa \
        --speaker jobs-stanford-2005 \
        --step all \
        [--force] [--no-review] [--repo-root /path/to/olorin]
"""

import argparse
import asyncio
import json
import logging
import sys
from dataclasses import asdict
from pathlib import Path

from app.core.logging_config import get_logger
from app.scripts.speaker_qa.answer_generator import generate_answers
from app.scripts.speaker_qa.asset_generator import generate_assets
from app.scripts.speaker_qa.config_loader import load_speaker_config
from app.scripts.speaker_qa.manifest_writer import write_manifest
from app.scripts.speaker_qa.models import (
    AssetResult, CallbackAnnotation, DraftAnswer, DraftQuestion, SpeakerConfig,
)
from app.scripts.speaker_qa.question_generator import generate_draft_questions

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = get_logger(__name__)

_SPEAKERS_DIR = Path("app/data/speakers")
_DRAFTS_DIR = _SPEAKERS_DIR / "drafts"
_VALID_STEPS = {"questions", "answers", "assets", "manifest", "all"}


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Speaker Q&A Pipeline")
    p.add_argument("--speaker", required=True, help="speaker_id (matches YAML filename)")
    p.add_argument("--step", default="all", choices=sorted(_VALID_STEPS))
    p.add_argument("--force", action="store_true", help="regenerate assets even if GCS has them")
    p.add_argument("--no-review", action="store_true", help="skip the human review gate")
    p.add_argument("--repo-root", default="/Users/olorin/Documents/Projects/olorin",
                   help="Absolute path to monorepo root (for manifest_path resolution)")
    return p.parse_args()


def _questions_draft_path(speaker_id: str) -> Path:
    return _DRAFTS_DIR / f"{speaker_id}.questions.draft.json"

def _answers_draft_path(speaker_id: str) -> Path:
    return _DRAFTS_DIR / f"{speaker_id}.answers.draft.json"

def _assets_draft_path(speaker_id: str) -> Path:
    return _DRAFTS_DIR / f"{speaker_id}.assets.draft.json"


def _save_questions(drafts: list[DraftQuestion], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps([asdict(d) for d in drafts], indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(drafts)} questions to {path}")


def _load_questions(path: Path) -> list[DraftQuestion]:
    return [DraftQuestion(**d) for d in json.loads(path.read_text())]


def _save_answers(answers: list[DraftAnswer], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serializable = [{"question": asdict(a.question), "response_text": a.response_text,
                     "callback": asdict(a.callback) if a.callback else None} for a in answers]
    path.write_text(json.dumps(serializable, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(answers)} answers to {path}")


def _load_answers(path: Path) -> list[DraftAnswer]:
    result = []
    for d in json.loads(path.read_text()):
        cb_data = d.get("callback")
        cb = CallbackAnnotation(**cb_data) if cb_data else None
        result.append(DraftAnswer(question=DraftQuestion(**d["question"]), response_text=d["response_text"], callback=cb))
    return result


def _save_assets(assets: list[AssetResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serializable = [{"answer": {"question": asdict(a.answer.question), "response_text": a.answer.response_text,
                                "callback": asdict(a.answer.callback) if a.answer.callback else None},
                     "audio_url": a.audio_url, "video_url": a.video_url, "duration": a.duration,
                     "content_hash": a.content_hash} for a in assets]
    path.write_text(json.dumps(serializable, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(assets)} asset entries to {path}")


def _load_assets(path: Path) -> list[AssetResult]:
    result = []
    for d in json.loads(path.read_text()):
        ans = d["answer"]
        cb_data = ans.get("callback")
        cb = CallbackAnnotation(**cb_data) if cb_data else None
        answer = DraftAnswer(question=DraftQuestion(**ans["question"]), response_text=ans["response_text"], callback=cb)
        result.append(AssetResult(answer=answer, audio_url=d["audio_url"], video_url=d["video_url"],
                                  duration=d["duration"], content_hash=d["content_hash"]))
    return result


def _review_gate(questions_path: Path) -> None:
    print("\n" + "=" * 60)
    print("REVIEW GATE — edit question drafts before answers are generated.")
    print(f"File: {questions_path.absolute()}")
    print("Press ENTER to continue, or Ctrl+C to abort.")
    print("=" * 60)
    input()


async def _run_step_questions(cfg: SpeakerConfig) -> list[DraftQuestion]:
    drafts = await generate_draft_questions(cfg)
    _save_questions(drafts, _questions_draft_path(cfg.speaker_id))
    return drafts

async def _run_step_answers(cfg: SpeakerConfig) -> list[DraftAnswer]:
    drafts = _load_questions(_questions_draft_path(cfg.speaker_id))
    answers = await generate_answers(cfg, drafts)
    _save_answers(answers, _answers_draft_path(cfg.speaker_id))
    return answers

async def _run_step_assets(cfg: SpeakerConfig, force: bool) -> list[AssetResult]:
    answers = _load_answers(_answers_draft_path(cfg.speaker_id))
    assets = await generate_assets(cfg, answers, force=force)
    _save_assets(assets, _assets_draft_path(cfg.speaker_id))
    return assets

def _run_step_manifest(cfg: SpeakerConfig, repo_root: str) -> None:
    assets = _load_assets(_assets_draft_path(cfg.speaker_id))
    write_manifest(cfg, assets, repo_root=repo_root)


async def main() -> int:
    args = _parse_args()
    yaml_path = _SPEAKERS_DIR / f"{args.speaker}.yaml"
    if not yaml_path.exists():
        print(f"ERROR: YAML config not found: {yaml_path.absolute()}", file=sys.stderr)
        return 1

    cfg = load_speaker_config(str(yaml_path))
    print(f"Loaded speaker config: {cfg.speaker_id} ({cfg.character_name})")

    if args.step in ("questions", "all"):
        await _run_step_questions(cfg)
        if args.step == "all" and not args.no_review:
            _review_gate(_questions_draft_path(cfg.speaker_id))

    if args.step in ("answers", "all"):
        await _run_step_answers(cfg)

    if args.step in ("assets", "all"):
        await _run_step_assets(cfg, force=args.force)

    if args.step in ("manifest", "all"):
        _run_step_manifest(cfg, repo_root=args.repo_root)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
