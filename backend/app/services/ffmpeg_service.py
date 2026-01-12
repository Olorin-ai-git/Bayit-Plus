"""
FFmpeg service for video analysis and subtitle extraction.

This service provides functionality to:
- Analyze video files and extract metadata
- Detect embedded subtitle tracks in MKV/MP4 files
- Extract subtitle content from video containers
"""

import subprocess
import json
import tempfile
import os
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class FFmpegService:
    """Service for video analysis and subtitle extraction using FFmpeg."""

    async def analyze_video(self, video_url: str) -> Dict[str, Any]:
        """
        Analyze video file and return metadata including subtitle tracks.

        Uses ffprobe to extract comprehensive video metadata including:
        - Duration, resolution, codec, bitrate, fps
        - All subtitle tracks with language and codec information

        Args:
            video_url: URL or path to the video file

        Returns:
            Dictionary containing:
            {
                "duration": 7265.5,
                "width": 1920,
                "height": 1080,
                "codec": "h264",
                "bitrate": 2500000,
                "fps": 23.976,
                "subtitle_tracks": [
                    {"index": 2, "language": "eng", "codec": "subrip", "title": "English"},
                    {"index": 3, "language": "spa", "codec": "subrip", "title": "Spanish"},
                    {"index": 4, "language": "heb", "codec": "ass", "title": "Hebrew"}
                ]
            }

        Raises:
            subprocess.CalledProcessError: If ffprobe fails
            json.JSONDecodeError: If ffprobe output is invalid
        """
        try:
            # Use ffprobe to get video metadata in JSON format
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                video_url
            ]

            logger.info(f"Analyzing video: {video_url}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30  # 30 second timeout for analysis
            )

            data = json.loads(result.stdout)

            # Parse video stream
            video_stream = next(
                (s for s in data.get('streams', []) if s.get('codec_type') == 'video'),
                None
            )

            # Parse subtitle streams
            subtitle_streams = [
                s for s in data.get('streams', [])
                if s.get('codec_type') == 'subtitle'
            ]

            # Calculate FPS from r_frame_rate (format: "24000/1001")
            fps = 0.0
            if video_stream and 'r_frame_rate' in video_stream:
                try:
                    numerator, denominator = map(int, video_stream['r_frame_rate'].split('/'))
                    if denominator > 0:
                        fps = numerator / denominator
                except (ValueError, ZeroDivisionError):
                    fps = 0.0

            metadata = {
                "duration": float(data.get('format', {}).get('duration', 0)),
                "bitrate": int(data.get('format', {}).get('bit_rate', 0)),
                "width": video_stream.get('width', 0) if video_stream else 0,
                "height": video_stream.get('height', 0) if video_stream else 0,
                "codec": video_stream.get('codec_name', '') if video_stream else '',
                "fps": round(fps, 3),
                "subtitle_tracks": [
                    {
                        "index": s['index'],
                        "language": s.get('tags', {}).get('language', 'und'),
                        "codec": s.get('codec_name', 'unknown'),
                        "title": s.get('tags', {}).get('title', '')
                    }
                    for s in subtitle_streams
                ]
            }

            logger.info(
                f"Video analysis complete: {metadata['width']}x{metadata['height']}, "
                f"{len(metadata['subtitle_tracks'])} subtitle tracks found"
            )

            return metadata

        except subprocess.TimeoutExpired:
            logger.error(f"Video analysis timed out for: {video_url}")
            raise Exception("Video analysis timed out after 30 seconds")
        except subprocess.CalledProcessError as e:
            logger.error(f"ffprobe failed for {video_url}: {e.stderr}")
            raise Exception(f"Failed to analyze video: {e.stderr}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from ffprobe: {e}")
            raise Exception("Failed to parse video metadata")
        except Exception as e:
            logger.error(f"Unexpected error analyzing video {video_url}: {str(e)}")
            raise

    async def extract_subtitle_track(
        self,
        video_url: str,
        track_index: int,
        output_format: str = 'srt'
    ) -> str:
        """
        Extract a specific subtitle track from video file.

        Args:
            video_url: URL or path to the video file
            track_index: Stream index of the subtitle track (from analyze_video)
            output_format: Output format ('srt' or 'vtt')

        Returns:
            Subtitle content as string (SRT or VTT format)

        Raises:
            subprocess.CalledProcessError: If ffmpeg extraction fails
            IOError: If temporary file operations fail
        """
        output_path = None
        try:
            # Create temporary file for subtitle output
            with tempfile.NamedTemporaryFile(
                suffix=f'.{output_format}',
                delete=False,
                mode='w',
                encoding='utf-8'
            ) as tmp:
                output_path = tmp.name

            logger.info(
                f"Extracting subtitle track {track_index} from {video_url} "
                f"to format {output_format}"
            )

            # Extract subtitle track using ffmpeg
            cmd = [
                'ffmpeg',
                '-i', video_url,
                '-map', f'0:{track_index}',  # Select specific subtitle stream
                '-f', output_format,          # Output format
                '-y',                          # Overwrite output file
                output_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=60  # 60 second timeout for extraction
            )

            # Read extracted subtitle content
            with open(output_path, 'r', encoding='utf-8') as f:
                subtitle_content = f.read()

            if not subtitle_content.strip():
                raise Exception("Extracted subtitle file is empty")

            logger.info(
                f"Successfully extracted subtitle track {track_index}, "
                f"size: {len(subtitle_content)} bytes"
            )

            return subtitle_content

        except subprocess.TimeoutExpired:
            logger.error(f"Subtitle extraction timed out for track {track_index}")
            raise Exception("Subtitle extraction timed out after 60 seconds")
        except subprocess.CalledProcessError as e:
            logger.error(f"ffmpeg extraction failed for track {track_index}: {e.stderr}")
            raise Exception(f"Failed to extract subtitle track: {e.stderr}")
        except IOError as e:
            logger.error(f"File operation failed during subtitle extraction: {str(e)}")
            raise Exception(f"Failed to read extracted subtitle file: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error extracting subtitle track {track_index}: {str(e)}")
            raise
        finally:
            # Cleanup temporary file
            if output_path and os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {output_path}: {str(e)}")

    async def extract_all_subtitles(self, video_url: str) -> List[Dict[str, str]]:
        """
        Extract all subtitle tracks from video file.

        This is a convenience method that:
        1. Analyzes the video to find all subtitle tracks
        2. Extracts each track to SRT format
        3. Returns the parsed subtitle content

        Args:
            video_url: URL or path to the video file

        Returns:
            List of dictionaries containing:
            [
                {
                    "language": "eng",
                    "format": "srt",
                    "content": "1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n",
                    "title": "English"
                },
                {
                    "language": "spa",
                    "format": "srt",
                    "content": "1\n00:00:01,000 --> 00:00:03,000\nHola mundo\n\n",
                    "title": "Spanish"
                }
            ]

        Raises:
            Exception: If video analysis or extraction fails
        """
        try:
            # Step 1: Analyze video to find subtitle tracks
            metadata = await self.analyze_video(video_url)
            subtitle_tracks = metadata.get('subtitle_tracks', [])

            if not subtitle_tracks:
                logger.info(f"No subtitle tracks found in {video_url}")
                return []

            logger.info(f"Found {len(subtitle_tracks)} subtitle tracks, extracting all...")

            # Step 2: Extract each subtitle track
            extracted_subtitles = []
            for track in subtitle_tracks:
                try:
                    content = await self.extract_subtitle_track(
                        video_url,
                        track['index'],
                        output_format='srt'
                    )

                    extracted_subtitles.append({
                        "language": track['language'],
                        "format": "srt",
                        "content": content,
                        "title": track.get('title', ''),
                        "codec": track.get('codec', 'unknown')
                    })

                    logger.info(
                        f"✓ Extracted {track['language']} subtitle "
                        f"(track {track['index']})"
                    )

                except Exception as e:
                    logger.error(
                        f"✗ Failed to extract subtitle track {track['index']} "
                        f"({track['language']}): {str(e)}"
                    )
                    # Continue with other tracks even if one fails
                    continue

            logger.info(
                f"Extraction complete: {len(extracted_subtitles)}/{len(subtitle_tracks)} "
                f"tracks successfully extracted"
            )

            return extracted_subtitles

        except Exception as e:
            logger.error(f"Failed to extract subtitles from {video_url}: {str(e)}")
            raise

    async def verify_ffmpeg_installation(self) -> Dict[str, Any]:
        """
        Verify that FFmpeg and ffprobe are installed and accessible.

        Returns:
            Dictionary containing:
            {
                "ffmpeg_installed": True,
                "ffprobe_installed": True,
                "ffmpeg_version": "8.0.1",
                "ffprobe_version": "8.0.1"
            }
        """
        result = {
            "ffmpeg_installed": False,
            "ffprobe_installed": False,
            "ffmpeg_version": None,
            "ffprobe_version": None
        }

        # Check ffmpeg
        try:
            ffmpeg_result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if ffmpeg_result.returncode == 0:
                result["ffmpeg_installed"] = True
                # Extract version from first line
                first_line = ffmpeg_result.stdout.split('\n')[0]
                if 'version' in first_line:
                    result["ffmpeg_version"] = first_line.split()[2]
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            logger.warning(f"ffmpeg check failed: {str(e)}")

        # Check ffprobe
        try:
            ffprobe_result = subprocess.run(
                ['ffprobe', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if ffprobe_result.returncode == 0:
                result["ffprobe_installed"] = True
                # Extract version from first line
                first_line = ffprobe_result.stdout.split('\n')[0]
                if 'version' in first_line:
                    result["ffprobe_version"] = first_line.split()[2]
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            logger.warning(f"ffprobe check failed: {str(e)}")

        return result


# Singleton instance
ffmpeg_service = FFmpegService()
