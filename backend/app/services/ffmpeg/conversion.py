"""
FFmpeg Video Conversion Module

This module provides video conversion, encoding, and transcoding functionality.
Supports format conversion, compression, resizing, and HLS generation.
"""

import asyncio
import json
import logging
import os
import subprocess
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class VideoConversionError(Exception):
    """Raised when video conversion fails."""



class VideoConversionTimeoutError(VideoConversionError):
    """Raised when video conversion times out."""


ABR_TIERS: List[Dict[str, Any]] = [
    {
        "name": "1080p",
        "width": 1920,
        "video_bitrate": "5000k",
        "audio_bitrate": "192k",
        "maxrate": "5500k",
        "bufsize": "10000k",
        "bandwidth": 5500000,
    },
    {
        "name": "720p",
        "width": 1280,
        "video_bitrate": "3000k",
        "audio_bitrate": "128k",
        "maxrate": "3300k",
        "bufsize": "6000k",
        "bandwidth": 3300000,
    },
    {
        "name": "480p",
        "width": 854,
        "video_bitrate": "1500k",
        "audio_bitrate": "96k",
        "maxrate": "1650k",
        "bufsize": "3000k",
        "bandwidth": 1700000,
    },
    {
        "name": "360p",
        "width": 640,
        "video_bitrate": "800k",
        "audio_bitrate": "64k",
        "maxrate": "900k",
        "bufsize": "1600k",
        "bandwidth": 900000,
    },
]


async def convert_video(
    input_path: str,
    output_path: str,
    video_codec: str = "libx264",
    audio_codec: str = "aac",
    preset: str = "fast",
    crf: int = 23,
    timeout: int = 3600,
) -> str:
    """
    Convert video to different format or codec.

    Args:
        input_path: Path to the input video file
        output_path: Path for the output video file
        video_codec: Video codec to use (default 'libx264')
        audio_codec: Audio codec to use (default 'aac')
        preset: Encoding preset (default 'fast')
        crf: Constant Rate Factor for quality (default 23, lower is better)
        timeout: Maximum time in seconds to wait (default 1 hour)

    Returns:
        Path to the converted video file

    Raises:
        VideoConversionError: If conversion fails
    """
    try:
        logger.info(f"Converting video: {input_path} -> {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-c:v",
            video_codec,
            "-preset",
            preset,
            "-crf",
            str(crf),
            "-c:a",
            audio_codec,
            "-movflags",
            "+faststart",
            "-y",
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"Video conversion timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(f"Failed to convert video: {stderr.decode()}")

        if not os.path.exists(output_path):
            raise VideoConversionError("Output file was not created")

        logger.info(f"Successfully converted video to {output_path}")
        return output_path

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to convert video: {str(e)}")
        raise VideoConversionError(f"Failed to convert video: {str(e)}")


async def transcode_video(
    input_path: str,
    output_path: str,
    target_codec: str = "h264",
    target_resolution: Optional[str] = None,
    target_bitrate: Optional[str] = None,
    timeout: int = 7200,
) -> str:
    """
    Transcode video to specific codec and optionally resize/change bitrate.

    Args:
        input_path: Path to the input video file
        output_path: Path for the output video file
        target_codec: Target video codec (default 'h264')
        target_resolution: Optional target resolution (e.g., '1920x1080', '1280x720')
        target_bitrate: Optional target bitrate (e.g., '2M', '5M')
        timeout: Maximum time in seconds to wait (default 2 hours)

    Returns:
        Path to the transcoded video file

    Raises:
        VideoConversionError: If transcoding fails
    """
    try:
        logger.info(f"Transcoding video: {input_path} -> {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # Map target codec to ffmpeg encoder
        codec_map = {
            "h264": "libx264",
            "h265": "libx265",
            "hevc": "libx265",
            "vp9": "libvpx-vp9",
            "av1": "libaom-av1",
        }
        encoder = codec_map.get(target_codec.lower(), target_codec)

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-c:v",
            encoder,
            "-c:a",
            "aac",
        ]

        if target_resolution:
            cmd.extend(["-s", target_resolution])

        if target_bitrate:
            cmd.extend(["-b:v", target_bitrate])
        else:
            # Use CRF for quality-based encoding
            cmd.extend(["-crf", "23"])

        cmd.extend(["-preset", "fast", "-movflags", "+faststart", "-y", output_path])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"Video transcoding timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(f"Failed to transcode video: {stderr.decode()}")

        if not os.path.exists(output_path):
            raise VideoConversionError("Output file was not created")

        logger.info(f"Successfully transcoded video to {output_path}")
        return output_path

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to transcode video: {str(e)}")
        raise VideoConversionError(f"Failed to transcode video: {str(e)}")


async def compress_video(
    input_path: str,
    output_path: str,
    target_size_mb: Optional[int] = None,
    crf: int = 28,
    timeout: int = 7200,
) -> str:
    """
    Compress video to reduce file size.

    Args:
        input_path: Path to the input video file
        output_path: Path for the compressed video file
        target_size_mb: Optional target file size in MB (uses 2-pass encoding)
        crf: Constant Rate Factor (default 28, higher = more compression)
        timeout: Maximum time in seconds to wait (default 2 hours)

    Returns:
        Path to the compressed video file

    Raises:
        VideoConversionError: If compression fails
    """
    try:
        logger.info(f"Compressing video: {input_path} -> {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        if target_size_mb:
            # Two-pass encoding for target file size
            # Get video duration first
            duration_cmd = [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                input_path,
            ]

            duration_result = subprocess.run(
                duration_cmd,
                capture_output=True,
                text=True,
                timeout=30,
            )

            import json

            duration_data = json.loads(duration_result.stdout)
            duration = float(duration_data.get("format", {}).get("duration", 0))

            if duration <= 0:
                raise VideoConversionError("Could not determine video duration")

            # Calculate target bitrate (bits per second)
            # target_size_bits = target_size_mb * 8 * 1024 * 1024
            # target_bitrate = target_size_bits / duration
            target_bitrate = int((target_size_mb * 8 * 1024 * 1024) / duration)

            # First pass
            pass1_cmd = [
                "ffmpeg",
                "-i",
                input_path,
                "-c:v",
                "libx264",
                "-b:v",
                str(target_bitrate),
                "-pass",
                "1",
                "-an",
                "-f",
                "null",
                "/dev/null",
            ]

            process = await asyncio.create_subprocess_exec(
                *pass1_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.communicate()

            # Second pass
            pass2_cmd = [
                "ffmpeg",
                "-i",
                input_path,
                "-c:v",
                "libx264",
                "-b:v",
                str(target_bitrate),
                "-pass",
                "2",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-y",
                output_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *pass2_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                process.kill()
                raise VideoConversionTimeoutError(
                    f"Video compression timed out after {timeout} seconds"
                )

        else:
            # Single pass CRF-based compression
            cmd = [
                "ffmpeg",
                "-i",
                input_path,
                "-c:v",
                "libx264",
                "-crf",
                str(crf),
                "-preset",
                "slow",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-y",
                output_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                process.kill()
                raise VideoConversionTimeoutError(
                    f"Video compression timed out after {timeout} seconds"
                )

            if process.returncode != 0:
                raise VideoConversionError(
                    f"Failed to compress video: {stderr.decode()}"
                )

        if not os.path.exists(output_path):
            raise VideoConversionError("Output file was not created")

        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = (1 - compressed_size / original_size) * 100

        logger.info(
            f"Successfully compressed video to {output_path} "
            f"(reduced by {compression_ratio:.1f}%)"
        )
        return output_path

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to compress video: {str(e)}")
        raise VideoConversionError(f"Failed to compress video: {str(e)}")


async def resize_video(
    input_path: str,
    output_path: str,
    width: int,
    height: int = -1,
    timeout: int = 3600,
) -> str:
    """
    Resize video to specified dimensions.

    Args:
        input_path: Path to the input video file
        output_path: Path for the resized video file
        width: Target width in pixels
        height: Target height in pixels (-1 to maintain aspect ratio)
        timeout: Maximum time in seconds to wait (default 1 hour)

    Returns:
        Path to the resized video file

    Raises:
        VideoConversionError: If resizing fails
    """
    try:
        logger.info(f"Resizing video: {input_path} -> {width}x{height}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # Build scale filter (height -1 or -2 maintains aspect ratio)
        scale_filter = f"scale={width}:{height}"
        if height == -1:
            # Ensure height is divisible by 2 for video codecs
            scale_filter = f"scale={width}:-2"

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-vf",
            scale_filter,
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-c:a",
            "copy",
            "-y",
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"Video resizing timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(f"Failed to resize video: {stderr.decode()}")

        if not os.path.exists(output_path):
            raise VideoConversionError("Output file was not created")

        logger.info(f"Successfully resized video to {output_path}")
        return output_path

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to resize video: {str(e)}")
        raise VideoConversionError(f"Failed to resize video: {str(e)}")


async def extract_audio(
    input_path: str,
    output_path: str,
    audio_codec: str = "aac",
    audio_bitrate: str = "192k",
    timeout: int = 1800,
) -> str:
    """
    Extract audio track from video file.

    Args:
        input_path: Path to the input video file
        output_path: Path for the audio file
        audio_codec: Audio codec (default 'aac')
        audio_bitrate: Audio bitrate (default '192k')
        timeout: Maximum time in seconds to wait (default 30 minutes)

    Returns:
        Path to the extracted audio file

    Raises:
        VideoConversionError: If extraction fails
    """
    try:
        logger.info(f"Extracting audio: {input_path} -> {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-vn",  # No video
            "-c:a",
            audio_codec,
            "-b:a",
            audio_bitrate,
            "-y",
            output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"Audio extraction timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(f"Failed to extract audio: {stderr.decode()}")

        if not os.path.exists(output_path):
            raise VideoConversionError("Output file was not created")

        logger.info(f"Successfully extracted audio to {output_path}")
        return output_path

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to extract audio: {str(e)}")
        raise VideoConversionError(f"Failed to extract audio: {str(e)}")


async def convert_to_hls(
    input_path: str,
    output_dir: str,
    segment_duration: int = 10,
    playlist_name: str = "playlist.m3u8",
    timeout: int = 7200,
) -> Dict[str, Any]:
    """
    Convert video to HLS (HTTP Live Streaming) format.

    Args:
        input_path: Path to the input video file
        output_dir: Directory for HLS output files
        segment_duration: Duration of each segment in seconds (default 10)
        playlist_name: Name of the HLS playlist file (default 'playlist.m3u8')
        timeout: Maximum time in seconds to wait (default 2 hours)

    Returns:
        Dictionary with HLS output information:
        {
            "playlist_path": "/path/to/playlist.m3u8",
            "output_dir": "/path/to/output",
            "segment_count": 42
        }

    Raises:
        VideoConversionError: If conversion fails
    """
    try:
        logger.info(f"Converting to HLS: {input_path} -> {output_dir}")

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        playlist_path = os.path.join(output_dir, playlist_name)
        segment_pattern = os.path.join(output_dir, "segment_%03d.ts")

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-c:v",
            "libx264",
            "-crf",
            "16",
            "-preset",
            "slow",
            "-tune",
            "grain",
            "-profile:v",
            "high",
            "-level:v",
            "4.1",
            "-pix_fmt",
            "yuv420p",
            "-g",
            "48",
            "-keyint_min",
            "48",
            "-c:a",
            "aac",
            "-b:a",
            "320k",
            "-hls_time",
            str(segment_duration),
            "-hls_list_size",
            "0",
            "-hls_segment_filename",
            segment_pattern,
            "-f",
            "hls",
            "-y",
            playlist_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"HLS conversion timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(f"Failed to convert to HLS: {stderr.decode()}")

        if not os.path.exists(playlist_path):
            raise VideoConversionError("HLS playlist was not created")

        # Count segments
        segment_count = len([f for f in os.listdir(output_dir) if f.endswith(".ts")])

        logger.info(f"Successfully converted to HLS: {segment_count} segments")

        return {
            "playlist_path": playlist_path,
            "output_dir": output_dir,
            "segment_count": segment_count,
        }

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"Failed to convert to HLS: {str(e)}")
        raise VideoConversionError(f"Failed to convert to HLS: {str(e)}")


async def probe_video_resolution(input_path: str) -> tuple:
    """
    Probe video file to determine source resolution.

    Args:
        input_path: Path or URL to the input video file

    Returns:
        Tuple of (width, height) in pixels

    Raises:
        VideoConversionError: If probing fails
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-select_streams", "v:0",
        input_path,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=60
        )
    except asyncio.TimeoutError:
        process.kill()
        raise VideoConversionError(
            "ffprobe timed out reading video resolution"
        )

    if process.returncode != 0:
        raise VideoConversionError(
            f"ffprobe failed to read video: {stderr.decode()}"
        )

    data = json.loads(stdout.decode())
    streams = data.get("streams", [])

    if not streams:
        raise VideoConversionError("No video stream found in source")

    width = streams[0].get("width", 0)
    height = streams[0].get("height", 0)

    if width <= 0 or height <= 0:
        raise VideoConversionError(
            f"Invalid video resolution: {width}x{height}"
        )

    logger.info(f"Probed source resolution: {width}x{height}")
    return (width, height)


async def convert_to_abr_hls(
    input_path: str,
    output_dir: str,
    segment_duration: int = 6,
    timeout: int = 28800,
) -> Dict[str, Any]:
    """
    Convert video to multi-bitrate ABR HLS format.

    Encodes the source into multiple quality tiers so HLS players can
    adaptively switch between resolutions based on available bandwidth.
    Tiers above source resolution are skipped (no upscaling).

    Args:
        input_path: Path or URL to the input video file
        output_dir: Directory for HLS output files
        segment_duration: Duration of each segment in seconds (default 6)
        timeout: Maximum time in seconds to wait (default 8 hours)

    Returns:
        Dictionary with ABR output information:
        {
            "output_dir": "/path/to/output",
            "variants": [
                {"name", "playlist", "width", "height",
                 "bandwidth", "segment_count"}
            ],
            "total_segment_count": 2286
        }

    Raises:
        VideoConversionError: If conversion fails
    """
    try:
        logger.info(
            f"Starting ABR HLS conversion: {input_path} -> {output_dir}"
        )
        os.makedirs(output_dir, exist_ok=True)

        src_width, src_height = await probe_video_resolution(input_path)

        # Filter tiers: skip those wider than source (no upscaling)
        tiers = [t for t in ABR_TIERS if t["width"] <= src_width]
        if not tiers:
            # Source smaller than all tiers - use the smallest tier
            tiers = [ABR_TIERS[-1]]

        num_tiers = len(tiers)
        tier_names = [t["name"] for t in tiers]
        logger.info(f"Selected {num_tiers} ABR tiers: {tier_names}")

        # Build filter_complex: split source video, scale each variant
        split_labels = "".join(f"[v{i}]" for i in range(num_tiers))
        filter_parts = [f"[0:v]split={num_tiers}{split_labels}"]
        for i, tier in enumerate(tiers):
            filter_parts.append(
                f"[v{i}]scale={tier['width']}:-2[v{i}out]"
            )
        filter_complex = "; ".join(filter_parts)

        cmd = [
            "ffmpeg", "-i", input_path,
            "-filter_complex", filter_complex,
        ]

        # Map all video outputs then all audio copies
        for i in range(num_tiers):
            cmd.extend(["-map", f"[v{i}out]"])
        for i in range(num_tiers):
            cmd.extend(["-map", "a:0"])

        # Per-tier video encoding params
        for i, tier in enumerate(tiers):
            cmd.extend([
                f"-c:v:{i}", "libx264",
                f"-b:v:{i}", tier["video_bitrate"],
                f"-maxrate:v:{i}", tier["maxrate"],
                f"-bufsize:v:{i}", tier["bufsize"],
            ])

        # Per-tier audio encoding params
        cmd.extend(["-c:a", "aac"])
        for i, tier in enumerate(tiers):
            cmd.extend([f"-b:a:{i}", tier["audio_bitrate"]])

        # Shared encoding settings for keyframe-aligned ABR
        cmd.extend([
            "-preset", "slow",
            "-profile:v", "high",
            "-level:v", "4.1",
            "-pix_fmt", "yuv420p",
            "-g", "48",
            "-keyint_min", "48",
            "-sc_threshold", "0",
        ])

        # HLS output settings with flat naming
        segment_pattern = os.path.join(
            output_dir, "v%v_segment_%03d.ts"
        )
        cmd.extend([
            "-f", "hls",
            "-hls_time", str(segment_duration),
            "-hls_list_size", "0",
            "-hls_segment_filename", segment_pattern,
        ])

        # Variant stream mapping
        var_map = " ".join(
            f"v:{i},a:{i}" for i in range(num_tiers)
        )
        cmd.extend(["-var_stream_map", var_map])

        # Output playlist pattern
        output_pattern = os.path.join(
            output_dir, "v%v_playlist.m3u8"
        )
        cmd.extend(["-y", output_pattern])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            process.kill()
            raise VideoConversionTimeoutError(
                f"ABR HLS conversion timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise VideoConversionError(
                f"ABR HLS conversion failed: "
                f"{stderr.decode()[-2000:]}"
            )

        # Build variant info and count segments per variant
        variants = []
        total_segment_count = 0

        for i, tier in enumerate(tiers):
            playlist_name = f"v{i}_playlist.m3u8"
            playlist_path = os.path.join(output_dir, playlist_name)

            if not os.path.exists(playlist_path):
                raise VideoConversionError(
                    f"Variant playlist not created: {playlist_name}"
                )

            prefix = f"v{i}_segment_"
            segment_count = len([
                f for f in os.listdir(output_dir)
                if f.startswith(prefix) and f.endswith(".ts")
            ])

            # Calculate actual height preserving aspect ratio
            height = int(
                round(tier["width"] * src_height / src_width)
            )
            if height % 2 != 0:
                height += 1

            variants.append({
                "name": tier["name"],
                "playlist": playlist_name,
                "width": tier["width"],
                "height": height,
                "bandwidth": tier["bandwidth"],
                "segment_count": segment_count,
            })
            total_segment_count += segment_count

        logger.info(
            f"ABR HLS conversion complete: {len(variants)} variants, "
            f"{total_segment_count} total segments"
        )

        return {
            "output_dir": output_dir,
            "variants": variants,
            "total_segment_count": total_segment_count,
        }

    except VideoConversionError:
        raise
    except Exception as e:
        logger.error(f"ABR HLS conversion failed: {str(e)}")
        raise VideoConversionError(
            f"ABR HLS conversion failed: {str(e)}"
        )
