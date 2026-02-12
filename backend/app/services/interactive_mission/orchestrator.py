"""Interactive Mission Orchestrator."""

import secrets
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.interactive_mission import InteractiveMission, MissionStatus
from app.services.interactive_mission.branch_assembly_service import branch_assembly_service
from app.services.interactive_mission.lipsync_service import lipsync_service
from app.services.interactive_mission.scene_composition_service import scene_composition_service
from app.services.interactive_mission.script_service import script_service
from app.services.proficiency.assessment_service import assessment_service
from app.services.star_story.content_safety_service import content_safety_service

logger = get_logger(__name__)
_VALID_VARIANTS = ("overlay", "inpainted")


class InteractiveMissionOrchestrator:
    """Orchestrates the interactive mission generation pipeline."""

    async def generate_mission(
        self, user_id: str, profile_id: str, avatar_id: str, show_content_id: str,
    ) -> InteractiveMission:
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or not avatar.is_ready:
            raise ValueError("Avatar not ready for mission generation")
        if avatar.user_id != user_id:
            raise ValueError("Avatar does not belong to this user")
        if not avatar.has_consent:
            raise ValueError("Parental consent required for mission generation")

        await self._check_daily_limit(user_id)
        proficiency = await assessment_service.get_or_create_proficiency(user_id, profile_id)

        mission = InteractiveMission(
            user_id=user_id, profile_id=profile_id, avatar_id=avatar_id,
            show_content_id=show_content_id,
            composition_variant=self._select_composition_variant(),
            status=MissionStatus.PENDING,
            credits_charged=settings.CREDIT_RATE_INTERACTIVE_MISSION,
        )
        await mission.insert()

        try:
            await self._run_scripting(mission, avatar, proficiency)
            await self._run_compositing(mission, avatar)
            await self._run_generating(mission, avatar)
            await self._run_assembling(mission)
            await self._run_safety_review(mission)
            logger.info("Mission generation complete", extra={
                "mission_id": str(mission.id), "status": mission.status.value,
            })
            return mission
        except Exception as exc:
            mission.status = MissionStatus.FAILED
            mission.error_message = self._sanitize_error(exc)
            mission.completed_at = datetime.now(timezone.utc)
            await mission.save()
            logger.error("Mission generation failed", extra={
                "mission_id": str(mission.id), "error": str(exc),
            })
            raise

    async def _set_stage(self, mission, status, stage, percent):
        mission.status = status
        mission.current_stage = stage
        mission.progress_percent = percent
        await mission.save()

    async def _run_scripting(self, mission, avatar, proficiency):
        await self._set_stage(mission, MissionStatus.SCRIPTING, "script", 10)
        await script_service.generate_script(
            mission=mission, child_name=avatar.child_first_name, proficiency=proficiency,
        )

    async def _run_compositing(self, mission, avatar):
        await self._set_stage(mission, MissionStatus.COMPOSITING, "compositing", 30)
        await scene_composition_service.compose_scenes(mission=mission, avatar=avatar)

    async def _run_generating(self, mission, avatar):
        await self._set_stage(mission, MissionStatus.GENERATING, "lipsync", 55)
        await lipsync_service.generate_lipsync_clips(mission=mission, avatar=avatar)

    async def _run_assembling(self, mission):
        await self._set_stage(mission, MissionStatus.ASSEMBLING, "assembly", 75)
        await branch_assembly_service.assemble_branches(mission=mission)

    async def _run_safety_review(self, mission):
        await self._set_stage(mission, MissionStatus.SAFETY_REVIEW, "safety", 90)
        safety = await content_safety_service.evaluate_mission(mission=mission)
        if safety.overall_safety >= settings.MISSION_SAFETY_THRESHOLD:
            mission.status = MissionStatus.READY
            mission.progress_percent = 100
            mission.safety = safety
        else:
            mission.status = MissionStatus.REJECTED
            mission.error_message = (
                f"Safety score {safety.overall_safety:.2f} "
                f"below threshold {settings.MISSION_SAFETY_THRESHOLD}"
            )
        mission.completed_at = datetime.now(timezone.utc)
        mission.current_stage = None
        await mission.save()

    def _select_composition_variant(self) -> str:
        mode = settings.MISSION_COMPOSITION_MODE
        if mode == "both":
            return secrets.choice(_VALID_VARIANTS)
        return mode if mode in _VALID_VARIANTS else "overlay"

    async def _check_daily_limit(self, user_id: str) -> None:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        today_count = await InteractiveMission.find(
            InteractiveMission.user_id == user_id,
            InteractiveMission.created_at >= today_start,
        ).count()
        if today_count >= settings.MISSION_MAX_PER_DAY:
            raise ValueError(
                f"Daily limit of {settings.MISSION_MAX_PER_DAY} missions reached"
            )

    @staticmethod
    def _sanitize_error(exc: Exception) -> str:
        """Return a user-safe error message, log raw details separately."""
        error_map = {
            "ValueError": str(exc),
            "httpx.HTTPStatusError": "External service error",
            "httpx.ConnectError": "External service unavailable",
            "httpx.TimeoutException": "External service timeout",
            "json.JSONDecodeError": "Response parsing error",
        }
        exc_type = type(exc).__name__
        return error_map.get(exc_type, "Mission generation failed")

    async def get_mission_progress(self, mission_id: str, user_id: str) -> dict:
        mission = await InteractiveMission.get(mission_id)
        if not mission:
            raise ValueError(f"Mission not found: {mission_id}")
        if mission.user_id != user_id:
            raise ValueError(f"Mission not found: {mission_id}")
        return {
            "mission_id": str(mission.id),
            "status": mission.status.value,
            "current_stage": mission.current_stage,
            "progress_percent": mission.progress_percent,
            "error_message": mission.error_message,
        }


mission_orchestrator = InteractiveMissionOrchestrator()
