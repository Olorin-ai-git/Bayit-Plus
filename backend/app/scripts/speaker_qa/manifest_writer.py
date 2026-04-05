"""Merges asset results into the portal-demo manifest JSON file."""

import json
from pathlib import Path

from app.core.logging_config import get_logger
from app.scripts.speaker_qa.models import AssetResult, SpeakerConfig

logger = get_logger(__name__)


def _resolve_manifest_path(cfg: SpeakerConfig, repo_root: str) -> Path:
    p = Path(cfg.manifest_path)
    if p.is_absolute():
        return p
    return Path(repo_root) / cfg.manifest_path


def write_manifest(cfg: SpeakerConfig, assets: list[AssetResult], repo_root: str) -> None:
    manifest_path = _resolve_manifest_path(cfg, repo_root)
    manifest = json.loads(manifest_path.read_text())

    static_by_ts: dict[float, list[AssetResult]] = {}
    memory_assets: list[AssetResult] = []
    for asset in assets:
        if asset.answer.question.is_memory_demo:
            memory_assets.append(asset)
        else:
            ts = asset.answer.question.moment_timestamp
            assert ts is not None
            static_by_ts.setdefault(ts, []).append(asset)

    for moment in manifest["moments"]:
        ts = float(moment["timestamp"])
        if ts not in static_by_ts:
            continue
        sorted_assets = sorted(static_by_ts[ts], key=lambda a: a.answer.question.index_in_moment)
        moment["questions"] = [
            {"text": a.answer.question.text, "response_text": a.answer.response_text,
             "video_url": a.video_url, "audio_url": a.audio_url, "duration": a.duration}
            for a in sorted_assets
        ]

    if memory_assets:
        sorted_mem = sorted(memory_assets, key=lambda a: a.answer.question.index_in_moment)
        manifest["memory_demo"] = {
            "character": cfg.character_name,
            "character_image": cfg.portrait_url,
            "exchanges": [
                {"question": a.answer.question.text, "response_text": a.answer.response_text,
                 "video_url": a.video_url, "audio_url": a.audio_url, "duration": a.duration,
                 "callback": {"phrase": a.answer.callback.phrase, "references_exchange": a.answer.callback.references_exchange} if a.answer.callback else None}
                for a in sorted_mem
            ],
        }

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    logger.info(
        "Manifest updated",
        extra={
            "path": str(manifest_path),
            "static_questions": sum(len(v) for v in static_by_ts.values()),
            "memory_demo_exchanges": len(memory_assets),
        },
    )
