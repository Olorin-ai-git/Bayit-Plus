"""
Episode Assembly Service.

Concatenates video clips with audio overlays into a final HLS-ready episode.
Uses FFmpeg for media processing.
"""

import asyncio
import logging
import tempfile
from pathlib import Path
from uuid import uuid4

from app.core.config import settings
from app.core.storage import StorageService
from app.models.story_episode import EpisodeStatus, StoryEpisode
from app.models.story_generation_job import (
    StoryGenerationJob,
    StoryJobStage,
)

logger = logging.getLogger(__name__)


class EpisodeAssemblyService:
    """Assembles final episode from scene video + audio clips."""

    def __init__(self):
        self._storage = StorageService()

    async def assemble_episode(
        self,
        episode: StoryEpisode,
    ) -> StoryEpisode:
        """
        Assemble final episode: concat scenes + overlay audio + HLS output.
        """
        if not episode.scene_media:
            raise ValueError("No scene media to assemble")

        job = StoryGenerationJob(
            episode_id=str(episode.id),
            user_id=episode.user_id,
            stage=StoryJobStage.EPISODE_ASSEMBLY,
            total_items=3,  # concat, overlay, hls
        )
        await job.insert()
        await job.start_processing()

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp = Path(tmpdir)
                scene_files = await self._download_scenes(episode, tmp)
                await job.update_progress(1)

                final_mp4 = tmp / "final.mp4"
                await self._concat_and_overlay(scene_files, final_mp4)
                await job.update_progress(2)

                hls_dir = tmp / "hls"
                hls_dir.mkdir()
                await self._generate_hls(final_mp4, hls_dir)

                base_path = (
                    f"star-story/episodes/{episode.user_id}/{episode.id}"
                )
                video_gcs = f"{base_path}/final_{uuid4()}.mp4"
                hls_gcs = f"{base_path}/hls/"

                final_bytes = final_mp4.read_bytes()
                await self._storage.upload_file_bytes(
                    final_bytes, video_gcs, "video/mp4"
                )

                for hls_file in hls_dir.iterdir():
                    content_type = (
                        "application/vnd.apple.mpegurl"
                        if hls_file.suffix == ".m3u8"
                        else "video/MP2T"
                    )
                    file_bytes = hls_file.read_bytes()
                    await self._storage.upload_file_bytes(
                        file_bytes,
                        f"{hls_gcs}{hls_file.name}",
                        content_type,
                    )

                manifest_path = f"{hls_gcs}master.m3u8"
                episode.final_video_gcs_path = video_gcs
                episode.hls_manifest_gcs_path = manifest_path
                await episode.save()
                await job.update_progress(3)

            await job.complete()

            logger.info(
                "Episode assembled",
                extra={
                    "episode_id": str(episode.id),
                    "video_gcs": video_gcs,
                },
            )
            return episode

        except Exception as exc:
            await job.fail(str(exc))
            raise

    async def _download_scenes(
        self, episode: StoryEpisode, tmp: Path
    ) -> list:
        """Download scene video/audio files to temp directory."""
        files = []
        for media in episode.scene_media:
            video_path = tmp / f"scene_{media.scene_number}_video.mp4"
            audio_path = tmp / f"scene_{media.scene_number}_audio.mp3"

            if media.video_gcs_path:
                video_bytes = await self._storage.download_file_bytes(
                    media.video_gcs_path
                )
                video_path.write_bytes(video_bytes)

            if media.audio_gcs_path:
                audio_bytes = await self._storage.download_file_bytes(
                    media.audio_gcs_path
                )
                audio_path.write_bytes(audio_bytes)

            files.append({
                "video": video_path,
                "audio": audio_path,
                "scene": media.scene_number,
            })
        return files

    async def _concat_and_overlay(
        self, scene_files: list, output: Path
    ) -> None:
        """Concatenate scene videos and overlay audio using FFmpeg."""
        concat_list = output.parent / "concat.txt"
        merged_parts = []

        for sf in scene_files:
            merged = output.parent / f"merged_{sf['scene']}.mp4"
            cmd = [
                "ffmpeg", "-y",
                "-i", str(sf["video"]),
                "-i", str(sf["audio"]),
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                str(merged),
            ]
            await self._run_ffmpeg(cmd)
            merged_parts.append(merged)

        lines = [f"file '{p}'" for p in merged_parts]
        concat_list.write_text("\n".join(lines))

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(output),
        ]
        await self._run_ffmpeg(cmd)

    async def _generate_hls(
        self, input_mp4: Path, hls_dir: Path
    ) -> None:
        """Generate HLS manifest and segments from MP4."""
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_mp4),
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac",
            "-hls_time", "6",
            "-hls_list_size", "0",
            "-hls_segment_filename",
            str(hls_dir / "segment_%03d.ts"),
            str(hls_dir / "master.m3u8"),
        ]
        await self._run_ffmpeg(cmd)

    async def _run_ffmpeg(self, cmd: list) -> None:
        """Run an FFmpeg command asynchronously."""
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(
                f"FFmpeg failed (code {proc.returncode}): "
                f"{stderr.decode()[:500]}"
            )


episode_assembly_service = EpisodeAssemblyService()
