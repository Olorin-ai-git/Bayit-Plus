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
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class FFmpegService:
    """Service for video analysis, subtitle extraction, and live stream recording using FFmpeg."""

    # Language code mapping (ISO 639-2 to ISO 639-1)
    LANGUAGE_CODE_MAP = {
        # Common 3-letter codes to 2-letter codes
        'eng': 'en',
        'spa': 'es',
        'heb': 'he',
        'fra': 'fr',
        'fre': 'fr',
        'ger': 'de',
        'deu': 'de',
        'ita': 'it',
        'por': 'pt',
        'rus': 'ru',
        'ara': 'ar',
        'chi': 'zh',
        'zho': 'zh',
        'jpn': 'ja',
        'kor': 'ko',
        'dut': 'nl',
        'nld': 'nl',
        'pol': 'pl',
        'swe': 'sv',
        'dan': 'da',
        'fin': 'fi',
        'nor': 'no',
        'nno': 'no',
        'cze': 'cs',
        'ces': 'cs',
        'tur': 'tr',
        'gre': 'el',
        'ell': 'el',
        'hun': 'hu',
        'rum': 'ro',
        'ron': 'ro',
        'tha': 'th',
        'vie': 'vi',
        'ind': 'id',
        'may': 'ms',
        'msa': 'ms',
        'ukr': 'uk',
        'bul': 'bg',
        'hrv': 'hr',
        'slv': 'sl',
        'lit': 'lt',
        'lav': 'lv',
        'est': 'et',
        'slk': 'sk',
    }

    def __init__(self):
        self.temp_dir = Path("/tmp/recordings")
        self.temp_dir.mkdir(exist_ok=True, parents=True)
    
    def normalize_language_code(self, code: str) -> str:
        """
        Normalize language code to 2-letter ISO 639-1 format.
        Accepts both 2-letter and 3-letter codes.
        """
        code_lower = code.lower().strip()
        
        # If it's already 2 letters, return as-is
        if len(code_lower) == 2:
            return code_lower
        
        # If it's 3 letters, try to map it
        if len(code_lower) == 3:
            return self.LANGUAGE_CODE_MAP.get(code_lower, code_lower)
        
        # Otherwise return as-is
        return code_lower

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

    def _is_text_based_subtitle(self, codec: str) -> bool:
        """
        Check if subtitle codec is text-based (can be converted to SRT).
        
        Bitmap-based subtitles (dvd_subtitle, hdmv_pgs_subtitle) cannot be 
        converted to text formats like SRT.
        
        Args:
            codec: Subtitle codec name from ffprobe
            
        Returns:
            True if codec is text-based, False if bitmap-based
        """
        # Text-based subtitle codecs that can be converted to SRT
        text_codecs = {
            'subrip', 'srt',           # SubRip
            'ass', 'ssa',              # Advanced SubStation Alpha
            'webvtt', 'vtt',           # WebVTT
            'mov_text',                 # MP4/MOV subtitles
            'text',                     # Generic text
            'sami',                     # SAMI
            'microdvd',                 # MicroDVD
            'subviewer',                # SubViewer
        }
        
        # Bitmap-based subtitle codecs that CANNOT be converted to text
        bitmap_codecs = {
            'dvd_subtitle', 'dvdsub',   # DVD bitmap subtitles
            'hdmv_pgs_subtitle', 'pgs', # Blu-ray PGS
            'xsub',                      # DivX subtitles
            'dvb_subtitle',              # DVB subtitles
        }
        
        codec_lower = codec.lower()
        
        if codec_lower in bitmap_codecs:
            return False
        if codec_lower in text_codecs:
            return True
            
        # Unknown codec - assume text-based (will fail gracefully if wrong)
        logger.warning(f"Unknown subtitle codec '{codec}', assuming text-based")
        return True

    async def extract_subtitle_track(
        self,
        video_url: str,
        track_index: int,
        output_format: str = 'srt',
        timeout: int = 120  # Increased to 120 seconds for large remote files
    ) -> str:
        """
        Extract a specific subtitle track from video file.

        Args:
            video_url: URL or path to the video file
            track_index: Stream index of the subtitle track (from analyze_video)
            output_format: Output format ('srt' or 'vtt')
            timeout: Maximum time in seconds to wait for extraction (default 20)

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
                f"to format {output_format} (timeout: {timeout}s)"
            )

            # Extract subtitle track using ffmpeg
            # Note: We don't use -codec copy because we need to convert to SRT format
            # For remote files, ffmpeg will only download subtitle data, not the entire video
            cmd = [
                'ffmpeg',
                '-analyzeduration', '10M',     # Analyze up to 10MB to find streams
                '-probesize', '10M',           # Probe up to 10MB
                '-i', video_url,
                '-map', f'0:{track_index}',    # Select specific subtitle stream
                '-f', output_format,            # Output format (converts to SRT)
                '-y',                           # Overwrite output file
                output_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=timeout  # Configurable timeout
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
            logger.error(f"Subtitle extraction timed out for track {track_index} after {timeout}s")
            raise Exception(f"Subtitle extraction timed out after {timeout} seconds")
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

    async def extract_all_subtitles(
        self, 
        video_url: str, 
        languages: Optional[List[str]] = None,
        max_parallel: int = 3
    ) -> List[Dict[str, str]]:
        """
        Extract subtitle tracks from video file with filtering and parallel processing.

        This method:
        1. Analyzes the video to find all subtitle tracks
        2. Filters by requested languages (if specified)
        3. Skips incompatible formats (bitmap subtitles)
        4. Extracts tracks in parallel for better performance
        5. Returns the parsed subtitle content

        Args:
            video_url: URL or path to the video file
            languages: Optional list of language codes to extract (e.g., ['en', 'es', 'he'])
                      If None, extracts all compatible tracks
            max_parallel: Maximum number of parallel extractions (default 3)

        Returns:
            List of dictionaries containing:
            [
                {
                    "language": "eng",
                    "format": "srt",
                    "content": "1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n",
                    "title": "English",
                    "codec": "subrip"
                },
                ...
            ]

        Raises:
            Exception: If video analysis fails
        """
        try:
            # Step 1: Analyze video to find subtitle tracks
            metadata = await self.analyze_video(video_url)
            subtitle_tracks = metadata.get('subtitle_tracks', [])

            if not subtitle_tracks:
                logger.info(f"No subtitle tracks found in {video_url}")
                return []

            logger.info(f"Found {len(subtitle_tracks)} subtitle tracks in video")

            # Step 2: Filter tracks before extraction
            tracks_to_extract = []
            skipped_bitmap = []
            skipped_language = []
            
            for track in subtitle_tracks:
                codec = track.get('codec', 'unknown')
                language_raw = track.get('language', 'und')
                language = self.normalize_language_code(language_raw)  # Normalize to 2-letter code
                
                # Skip bitmap-based subtitles (can't convert to text)
                if not self._is_text_based_subtitle(codec):
                    skipped_bitmap.append(f"{language} ({codec})")
                    logger.info(
                        f"⊘ Skipping track {track['index']} ({language_raw}→{language}): "
                        f"bitmap codec '{codec}' cannot convert to SRT"
                    )
                    continue
                
                # Filter by language if specified (compare normalized codes)
                if languages and language not in languages:
                    skipped_language.append(f"{language_raw}→{language} (not in {languages})")
                    continue
                
                # Store normalized language code in track
                track['language'] = language
                track['language_raw'] = language_raw
                tracks_to_extract.append(track)
            
            if skipped_bitmap:
                logger.info(f"Skipped {len(skipped_bitmap)} bitmap subtitle tracks: {', '.join(skipped_bitmap)}")
            if skipped_language:
                logger.info(f"Skipped {len(skipped_language)} tracks by language filter: {', '.join(skipped_language)}")

            if not tracks_to_extract:
                logger.info(f"No compatible subtitle tracks to extract after filtering")
                return []

            logger.info(
                f"Extracting {len(tracks_to_extract)} compatible subtitle tracks "
                f"(max {max_parallel} parallel)..."
            )

            # Step 3: Extract tracks in parallel with semaphore to limit concurrency
            semaphore = asyncio.Semaphore(max_parallel)
            
            async def extract_with_semaphore(track):
                async with semaphore:
                    try:
                        content = await self.extract_subtitle_track(
                            video_url,
                            track['index'],
                            output_format='srt',
                            timeout=120  # 120 second timeout per track for large remote files
                        )

                        logger.info(
                            f"✓ Extracted {track['language']} subtitle "
                            f"(track {track['index']}, codec: {track.get('codec', 'unknown')})"
                        )

                        return {
                            "language": track['language'],
                            "format": "srt",
                            "content": content,
                            "title": track.get('title', ''),
                            "codec": track.get('codec', 'unknown'),
                            "index": track['index']
                        }

                    except Exception as e:
                        logger.error(
                            f"✗ Failed to extract subtitle track {track['index']} "
                            f"({track['language']}, {track.get('codec', 'unknown')}): {str(e)}"
                        )
                        return None  # Return None for failed extractions

            # Run all extractions in parallel
            results = await asyncio.gather(
                *[extract_with_semaphore(track) for track in tracks_to_extract],
                return_exceptions=False  # Let individual exceptions be caught in extract_with_semaphore
            )

            # Filter out None results (failed extractions)
            extracted_subtitles = [r for r in results if r is not None]

            logger.info(
                f"✅ Extraction complete: {len(extracted_subtitles)}/{len(tracks_to_extract)} "
                f"tracks successfully extracted"
            )

            return extracted_subtitles

        except Exception as e:
            logger.error(f"Failed to extract subtitles from {video_url}: {str(e)}")
            raise

    async def start_recording_stream(
        self,
        stream_url: str,
        output_path: str,
        recording_id: str,
        max_duration_seconds: int = 14400
    ) -> subprocess.Popen:
        """
        Start recording HLS stream with FFmpeg.

        Args:
            stream_url: HLS stream URL to record
            output_path: Path where to save the recording
            recording_id: Unique recording identifier for progress monitoring
            max_duration_seconds: Maximum recording duration (default 4 hours)

        Returns:
            FFmpeg process handle
        """
        try:
            logger.info(f"Starting recording of stream {stream_url} to {output_path}")

            # FFmpeg command for HLS recording with re-encoding
            cmd = [
                'ffmpeg',
                '-i', stream_url,
                '-c:v', 'libx264',  # Re-encode to H.264
                '-preset', 'faster',  # Balance speed/quality
                '-crf', '23',  # Quality
                '-c:a', 'aac',  # Audio codec
                '-b:a', '128k',  # Audio bitrate
                '-movflags', '+faststart',  # Web optimization
                '-t', str(max_duration_seconds),  # Max duration
                '-progress', 'pipe:1',  # Progress output
                '-loglevel', 'error',
                '-y',  # Overwrite output file
                output_path
            ]

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            logger.info(f"FFmpeg recording started with PID {process.pid}")

            # Monitor progress in background
            asyncio.create_task(self._monitor_ffmpeg_progress(process, recording_id))

            return process

        except Exception as e:
            logger.error(f"Failed to start recording: {str(e)}")
            raise Exception(f"Failed to start recording: {str(e)}")

    async def _monitor_ffmpeg_progress(
        self,
        process: subprocess.Popen,
        recording_id: str
    ):
        """
        Monitor FFmpeg progress and update session.

        Parses FFmpeg progress output and can be used to update
        RecordingSession with duration and file size information.

        Args:
            process: FFmpeg process to monitor
            recording_id: Recording identifier for updates
        """
        try:
            logger.info(f"Starting progress monitor for recording {recording_id}")

            while process.poll() is None:
                line = process.stdout.readline()
                if not line:
                    await asyncio.sleep(0.1)
                    continue

                # Parse FFmpeg progress output
                # Format: key=value pairs like "out_time_ms=5000000"
                if '=' in line:
                    key, value = line.strip().split('=', 1)

                    if key == 'out_time_ms':
                        # Convert microseconds to seconds
                        try:
                            duration_seconds = int(value) // 1000000
                            logger.debug(f"Recording {recording_id}: {duration_seconds}s")
                        except ValueError:
                            pass

                    # Could update RecordingSession here with progress
                    # await update_recording_session(recording_id, duration, file_size)

            # Process completed
            return_code = process.returncode
            logger.info(f"Recording {recording_id} completed with code {return_code}")

        except Exception as e:
            logger.error(f"Error monitoring FFmpeg progress: {str(e)}")

    async def stop_recording(self, process: subprocess.Popen):
        """
        Gracefully stop FFmpeg recording.

        Sends SIGTERM for graceful stop, waits up to 10 seconds,
        then kills the process if it doesn't stop.

        Args:
            process: FFmpeg process to stop
        """
        try:
            logger.info(f"Stopping recording process PID {process.pid}")

            # Send SIGTERM for graceful stop
            process.terminate()

            try:
                await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(None, process.wait),
                    timeout=10
                )
                logger.info(f"Recording stopped gracefully")
            except asyncio.TimeoutError:
                logger.warning(f"Recording didn't stop gracefully, killing process")
                process.kill()
                await asyncio.get_event_loop().run_in_executor(None, process.wait)

        except Exception as e:
            logger.error(f"Error stopping recording: {str(e)}")
            raise

    async def extract_thumbnail_from_video(
        self,
        video_path: str,
        output_path: str,
        timestamp_seconds: int = 30
    ):
        """
        Extract thumbnail from video at specific timestamp.

        Args:
            video_path: Path to video file
            output_path: Path where to save thumbnail
            timestamp_seconds: Timestamp to extract frame from (default 30s)
        """
        try:
            logger.info(f"Extracting thumbnail from {video_path} at {timestamp_seconds}s")

            cmd = [
                'ffmpeg',
                '-ss', str(timestamp_seconds),
                '-i', video_path,
                '-vframes', '1',
                '-vf', 'scale=1280:-1',
                '-q:v', '2',
                '-y',
                output_path
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            await process.wait()

            if process.returncode != 0:
                raise Exception(f"FFmpeg thumbnail extraction failed with code {process.returncode}")

            logger.info(f"Thumbnail extracted successfully to {output_path}")

        except Exception as e:
            logger.error(f"Failed to extract thumbnail: {str(e)}")
            raise

    async def get_video_info(self, video_path: str) -> dict:
        """
        Get video metadata using ffprobe.

        Args:
            video_path: Path to video file

        Returns:
            Dictionary with video metadata including codec, resolution, duration, etc.
        """
        try:
            logger.info(f"Getting video info for {video_path}")

            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                video_path
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                raise Exception(f"ffprobe failed: {stderr.decode()}")

            data = json.loads(stdout.decode())

            # Extract video and audio stream info
            video_stream = next(
                (s for s in data.get('streams', []) if s.get('codec_type') == 'video'),
                {}
            )
            audio_stream = next(
                (s for s in data.get('streams', []) if s.get('codec_type') == 'audio'),
                {}
            )

            info = {
                'duration': float(data.get('format', {}).get('duration', 0)),
                'size': int(data.get('format', {}).get('size', 0)),
                'bitrate': int(data.get('format', {}).get('bit_rate', 0)),
                'video_codec': video_stream.get('codec_name', 'unknown'),
                'audio_codec': audio_stream.get('codec_name', 'unknown'),
                'width': video_stream.get('width', 0),
                'height': video_stream.get('height', 0),
                'resolution': f"{video_stream.get('height', 0)}p" if video_stream.get('height') else 'unknown'
            }

            logger.info(f"Video info retrieved: {info['resolution']}, {info['duration']}s, {info['size']} bytes")

            return info

        except Exception as e:
            logger.error(f"Failed to get video info: {str(e)}")
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
