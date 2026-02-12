"""Manifest builder for interactive mission HLS playback."""

from typing import Dict, List, Optional

from app.models.interactive_mission import MissionScene


def build_prerendered_entry(
    scene: MissionScene, hls_path: str,
) -> dict:
    return {
        "scene": scene.scene_number,
        "hls_path": f"{hls_path}/master.m3u8",
        "duration": scene.duration_seconds,
        "preloaded": True,
    }


def build_branch_entry(
    scene: MissionScene, base_path: str,
) -> Dict:
    decision = scene.decision
    return {
        "prompt": decision.prompt_text,
        "prompt_transliteration": decision.prompt_transliteration,
        "prompt_translation": decision.prompt_translation,
        "decision_type": decision.decision_type.value,
        "expected_responses": decision.expected_responses,
        "timeout_seconds": decision.timeout_seconds,
        "max_attempts": decision.max_attempts,
        "hint_text": decision.hint_text,
        "hint_text_he": decision.hint_text_he,
        "options": {
            "success": {
                "scene": decision.next_scene_on_success,
                "hls_path": (
                    f"{base_path}/scene_"
                    f"{decision.next_scene_on_success}"
                    f"/master.m3u8"
                ),
            },
            "retry": {
                "scene": scene.scene_number,
                "hls_path": (
                    f"{base_path}/scene_"
                    f"{scene.scene_number}/master.m3u8"
                ),
            },
        },
    }


def build_manifest(
    prerendered: List[dict],
    on_demand_branches: Dict,
    all_paths: List[dict],
    total_scenes: int,
    composition_variant: str,
) -> Dict:
    return {
        "prerendered_scenes": prerendered,
        "on_demand_branches": on_demand_branches,
        "all_paths": all_paths,
        "total_scenes": total_scenes,
        "composition_variant": composition_variant,
    }


def get_scene_video_path(
    scene: MissionScene, variant: str,
) -> Optional[str]:
    if scene.lipsync_video_gcs_path:
        return scene.lipsync_video_gcs_path
    if variant == "inpainted" and scene.inpainted_video_gcs_path:
        return scene.inpainted_video_gcs_path
    return scene.overlay_video_gcs_path
