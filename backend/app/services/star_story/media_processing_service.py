"""
Media Processing Service.

FFmpeg-based media operations for interactive missions:
overlay, HLS encoding, audio extraction, image compositing.
"""

import asyncio
import tempfile
from pathlib import Path

from app.core.logging_config import get_logger
from app.core.storage import StorageService

logger = get_logger(__name__)


class MediaProcessingService:
    """FFmpeg-based media processing for missions and snaps."""

    def __init__(self):
        self._storage = StorageService()

    async def overlay_image_on_video(
        self, background_path: str, overlay_image_path: str,
        output_path: str, x_position: float = 0.5,
        y_position: float = 0.5, scale: float = 0.3,
    ) -> None:
        """Overlay a PNG image onto a video with alpha blending."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            bg, ol, out = tmp / "bg.mp4", tmp / "overlay.png", tmp / "out.mp4"
            bg.write_bytes(await self._storage.download_file_bytes(background_path))
            ol.write_bytes(await self._storage.download_file_bytes(overlay_image_path))
            x_expr, y_expr = f"(W-w)*{x_position}", f"(H-h)*{y_position}"
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(bg), "-i", str(ol),
                "-filter_complex",
                f"[1:v]scale=iw*{scale}:ih*{scale}[ov];[0:v][ov]overlay={x_expr}:{y_expr}",
                "-c:a", "copy", str(out),
            ])
            await self._storage.upload_file_bytes(out.read_bytes(), output_path, "video/mp4")

    async def encode_to_hls(self, video_path: str, output_dir: str) -> None:
        """Encode a video to HLS segments."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            src, hls = tmp / "source.mp4", tmp / "hls"
            hls.mkdir()
            src.write_bytes(await self._storage.download_file_bytes(video_path))
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(src),
                "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
                "-hls_time", "6", "-hls_list_size", "0",
                "-hls_segment_filename", str(hls / "segment_%03d.ts"),
                str(hls / "master.m3u8"),
            ])
            for f in hls.iterdir():
                ct = "application/vnd.apple.mpegurl" if f.suffix == ".m3u8" else "video/MP2T"
                await self._storage.upload_file_bytes(
                    f.read_bytes(), f"{output_dir}/{f.name}", ct,
                )

    async def concat_hls_segments(
        self, segment_paths: list, output_manifest: str,
    ) -> None:
        """Concatenate HLS segments into a combined manifest."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            parts = []
            for i, sp in enumerate(segment_paths):
                local = tmp / f"seg_{i}.m3u8"
                local.write_bytes(await self._storage.download_file_bytes(sp))
                parts.append(local)
            concat_file = tmp / "concat.txt"
            concat_file.write_text("\n".join(f"file '{p}'" for p in parts))
            out = tmp / "master.m3u8"
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat_file), "-c", "copy", str(out),
            ])
            await self._storage.upload_file_bytes(
                out.read_bytes(), output_manifest, "application/vnd.apple.mpegurl",
            )

    async def extract_audio(
        self, video_path: str, audio_output_path: str,
    ) -> None:
        """Extract audio track from a video file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            src, out = tmp / "source.mp4", tmp / "audio.mp3"
            src.write_bytes(await self._storage.download_file_bytes(video_path))
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(src), "-vn",
                "-c:a", "libmp3lame", "-q:a", "2", str(out),
            ])
            await self._storage.upload_file_bytes(
                out.read_bytes(), audio_output_path, "audio/mpeg",
            )

    async def compose_image(
        self, avatar_path: str, template: str,
        character_names: list, output_path: str,
    ) -> None:
        """Composite avatar onto a template canvas for snap generation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            avatar_local, out = tmp / "avatar.png", tmp / "composite.png"
            avatar_local.write_bytes(
                await self._storage.download_file_bytes(avatar_path),
            )
            logger.debug(
                "Compositing snap",
                extra={"template": template, "characters": len(character_names)},
            )
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(avatar_local), "-vf",
                "scale=1024:1024:force_original_aspect_ratio=decrease,"
                "pad=1024:1024:-1:-1:color=transparent",
                str(out),
            ])
            await self._storage.upload_file_bytes(
                out.read_bytes(), output_path, "image/png",
            )

    async def add_watermark(
        self, image_path: str, watermark_text: str, output_path: str,
    ) -> None:
        """Add a text watermark to an image."""
        safe_text = watermark_text.replace("'", "\\'")
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            src, out = tmp / "source.png", tmp / "watermarked.png"
            src.write_bytes(await self._storage.download_file_bytes(image_path))
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(src), "-vf",
                f"drawtext=text='{safe_text}':fontsize=24"
                f":fontcolor=white@0.5:x=10:y=H-th-10",
                str(out),
            ])
            await self._storage.upload_file_bytes(
                out.read_bytes(), output_path, "image/png",
            )

    async def generate_thumbnail(
        self, image_path: str, output_path: str,
        width: int = 300, height: int = 300,
    ) -> None:
        """Generate a thumbnail from an image."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            src, out = tmp / "source.png", tmp / "thumb.png"
            src.write_bytes(await self._storage.download_file_bytes(image_path))
            await self._run_ffmpeg([
                "ffmpeg", "-y", "-i", str(src), "-vf",
                f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                str(out),
            ])
            await self._storage.upload_file_bytes(
                out.read_bytes(), output_path, "image/png",
            )

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


media_processing_service = MediaProcessingService()
