"""Branch Assembly Service - HLS segments and interactive manifest."""

from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.interactive_mission import (
    InteractiveMission,
    MissionPath,
    MissionScene,
)
from app.services.interactive_mission.manifest_builder import (
    build_branch_entry,
    build_manifest,
    build_prerendered_entry,
    get_scene_video_path,
)
from app.services.star_story.media_processing_service import (
    media_processing_service,
)

logger = get_logger(__name__)


class BranchAssemblyService:
    """Assembles mission branches into HLS segments."""

    async def assemble_branches(
        self, mission: InteractiveMission,
    ) -> None:
        prerender_count = settings.MISSION_PRERENDER_SCENES
        base_path = f"missions/{mission.user_id}/{mission.id}/hls"
        paths = await self._build_all_paths(mission.scenes)
        prerendered: List[dict] = []
        on_demand_branches: Dict = {}

        for i, scene in enumerate(mission.scenes):
            video_path = get_scene_video_path(scene, mission.composition_variant)
            if i < prerender_count and video_path:
                hls_path = f"{base_path}/scene_{scene.scene_number}"
                await self._encode_hls_segment(video_path, hls_path)
                prerendered.append(build_prerendered_entry(scene, hls_path))
            if scene.decision:
                on_demand_branches[scene.decision.decision_id] = (
                    build_branch_entry(scene, base_path)
                )

        all_paths_manifest = []
        for path in paths:
            hls_manifest = f"{base_path}/path_{path.path_id}/master.m3u8"
            await self._concat_path_segments(path, mission.scenes, base_path, hls_manifest)
            path.hls_manifest_gcs_path = hls_manifest
            all_paths_manifest.append({"path_id": path.path_id, "hls_manifest": hls_manifest})

        mission.interactive_manifest = build_manifest(
            prerendered, on_demand_branches, all_paths_manifest,
            len(mission.scenes), mission.composition_variant,
        )
        mission.paths = paths
        mission.hls_base_path = base_path
        await mission.save()

        logger.info(
            "Branch assembly complete",
            extra={
                "mission_id": str(mission.id),
                "prerendered": len(prerendered),
                "branches": len(on_demand_branches),
                "paths": len(paths),
            },
        )

    async def _build_all_paths(self, scenes: List[MissionScene]) -> List[MissionPath]:
        paths: List[MissionPath] = []
        self._traverse_paths(scenes, 0, [], paths, path_counter=[0])
        return paths

    def _traverse_paths(
        self, scenes: List[MissionScene], current_idx: int,
        current_sequence: List[int], paths: List[MissionPath],
        path_counter: list, depth: int = 0,
    ) -> None:
        if current_idx >= len(scenes) or depth > 20:
            if current_sequence:
                path_counter[0] += 1
                paths.append(MissionPath(
                    path_id=f"path_{path_counter[0]:03d}",
                    scene_sequence=list(current_sequence),
                ))
            return

        scene = scenes[current_idx]
        current_sequence.append(scene.scene_number)

        if scene.decision:
            success_idx = self._find_scene_index(scenes, scene.decision.next_scene_on_success)
            failure_idx = self._find_scene_index(scenes, scene.decision.next_scene_on_failure)
            if success_idx is not None:
                self._traverse_paths(
                    scenes, success_idx, list(current_sequence),
                    paths, path_counter, depth + 1,
                )
            if failure_idx is not None and failure_idx != success_idx:
                self._traverse_paths(
                    scenes, failure_idx, list(current_sequence),
                    paths, path_counter, depth + 1,
                )
        else:
            self._traverse_paths(
                scenes, current_idx + 1, current_sequence,
                paths, path_counter, depth + 1,
            )

    def _find_scene_index(
        self, scenes: List[MissionScene], scene_number: int,
    ) -> Optional[int]:
        for i, s in enumerate(scenes):
            if s.scene_number == scene_number:
                return i
        return None

    async def _encode_hls_segment(self, video_path: str, output_dir: str) -> None:
        try:
            await media_processing_service.encode_to_hls(video_path, output_dir)
        except Exception as exc:
            logger.error(
                "HLS segment encoding failed",
                extra={"video_path": video_path, "output": output_dir, "error": str(exc)},
            )
            raise

    async def _concat_path_segments(
        self, path: MissionPath, scenes: List[MissionScene],
        base_path: str, output_manifest: str,
    ) -> None:
        segment_paths = []
        total_duration = 0.0
        for scene_num in path.scene_sequence:
            scene = next((s for s in scenes if s.scene_number == scene_num), None)
            if scene:
                segment_paths.append(f"{base_path}/scene_{scene_num}/master.m3u8")
                total_duration += scene.duration_seconds
        path.total_duration_seconds = total_duration
        if segment_paths:
            try:
                await media_processing_service.concat_hls_segments(segment_paths, output_manifest)
            except Exception as exc:
                logger.error(
                    "HLS path concatenation failed",
                    extra={"path_id": path.path_id, "segments": len(segment_paths), "error": str(exc)},
                )
                raise


branch_assembly_service = BranchAssemblyService()
