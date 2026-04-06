"""SCORM package builder — assembles the final zip."""

import json
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from jinja2 import Environment, FileSystemLoader

from app.core.logging_config import get_logger

logger = get_logger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


@dataclass
class PackageBuildContext:
    """All data needed to build a SCORM package."""

    export_id: str
    content_id: str
    content_title: str
    video_url: str
    video_source: str
    export_token: str
    api_base_url: str
    completion_rule: str
    video_threshold_pct: int
    quiz_pass_pct: int
    mastery_score: int
    characters: List[Dict]
    media_files: Dict[str, bytes] = field(default_factory=dict)
    embedded_video_bytes: Optional[bytes] = None


def build_scorm_package(ctx: PackageBuildContext, output_path: str) -> None:
    """
    Build a SCORM 1.2 zip package from the build context.

    Writes the zip to output_path.
    """
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
    )

    content_files = list(ctx.media_files.keys())
    if ctx.video_source == "embedded" and ctx.embedded_video_bytes:
        content_files.append("content/video/video.mp4")

    manifest_template = env.get_template("imsmanifest.xml.j2")
    manifest_xml = manifest_template.render(
        export_id=ctx.export_id,
        content_title=ctx.content_title,
        mastery_score=ctx.mastery_score,
        content_files=content_files,
    )

    config_json = json.dumps({
        "export_id": ctx.export_id,
        "export_token": ctx.export_token,
        "api_base": ctx.api_base_url,
        "completion_rule": ctx.completion_rule,
        "video_threshold_pct": ctx.video_threshold_pct,
        "quiz_pass_pct": ctx.quiz_pass_pct,
        "offline_mode": True,
        "video_source": ctx.video_source,
    }, indent=2)

    video_url = ctx.video_url
    if ctx.video_source == "embedded":
        video_url = "content/video/video.mp4"

    content_manifest = json.dumps({
        "content_id": ctx.content_id,
        "title": ctx.content_title,
        "video_url": video_url,
        "characters": ctx.characters,
    }, indent=2)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", manifest_xml)
        zf.writestr("config.json", config_json)
        zf.writestr("content/manifest.json", content_manifest)

        static_files = [
            "index.html", "player.js", "scorm-api.js",
            "character-engine.js", "styles.css",
        ]
        for filename in static_files:
            filepath = TEMPLATES_DIR / filename
            if filepath.exists():
                zf.write(str(filepath), f"player/{filename}")

        for rel_path, data in ctx.media_files.items():
            zf.writestr(rel_path, data)

        if ctx.video_source == "embedded" and ctx.embedded_video_bytes:
            zf.writestr("content/video/video.mp4", ctx.embedded_video_bytes)

    logger.info(
        "SCORM package built",
        extra={
            "export_id": ctx.export_id,
            "output_path": output_path,
            "files": len(ctx.media_files) + len(static_files) + 3,
        },
    )
