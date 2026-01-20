"""
Subtitle Service.
Handles parsing and processing of VTT/SRT subtitle files.
"""
import re
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class SubtitleCue:
    """A single subtitle cue/segment"""

    index: int
    start_time: float  # seconds
    end_time: float  # seconds
    text: str
    text_nikud: Optional[str] = None  # With vocalization marks


@dataclass
class SubtitleTrack:
    """A complete subtitle track"""

    cues: List[SubtitleCue]
    language: str = "he"
    format: str = "vtt"  # vtt or srt
    has_nikud: bool = False


def parse_timestamp_vtt(timestamp: str) -> float:
    """Parse VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) to seconds"""
    parts = timestamp.strip().split(":")

    if len(parts) == 3:
        hours, minutes, seconds = parts
    elif len(parts) == 2:
        hours = 0
        minutes, seconds = parts
    else:
        return 0.0

    # Handle milliseconds
    if "." in seconds:
        secs, ms = seconds.split(".")
        return int(hours) * 3600 + int(minutes) * 60 + int(secs) + int(ms) / 1000
    else:
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def parse_timestamp_srt(timestamp: str) -> float:
    """Parse SRT timestamp (HH:MM:SS,mmm) to seconds"""
    # SRT uses comma for milliseconds
    timestamp = timestamp.replace(",", ".")
    return parse_timestamp_vtt(timestamp)


def parse_vtt(content: str) -> SubtitleTrack:
    """
    Parse WebVTT subtitle content.
    Returns a SubtitleTrack with all cues.
    """
    cues = []
    lines = content.strip().split("\n")

    # Skip WEBVTT header
    i = 0
    while i < len(lines) and not "-->" in lines[i]:
        i += 1

    cue_index = 0
    while i < len(lines):
        line = lines[i].strip()

        # Look for timestamp line
        if "-->" in line:
            try:
                # Parse timestamps
                parts = line.split("-->")
                start_time = parse_timestamp_vtt(parts[0].strip())
                # End time might have position info after it
                end_part = parts[1].strip().split()[0]
                end_time = parse_timestamp_vtt(end_part)

                # Collect text lines
                i += 1
                text_lines = []
                while i < len(lines) and lines[i].strip():
                    # Remove VTT styling tags
                    text = re.sub(r"<[^>]+>", "", lines[i])
                    text_lines.append(text.strip())
                    i += 1

                if text_lines:
                    cue_index += 1
                    cues.append(
                        SubtitleCue(
                            index=cue_index,
                            start_time=start_time,
                            end_time=end_time,
                            text=" ".join(text_lines),
                        )
                    )
            except Exception as e:
                print(f"Error parsing VTT cue at line {i}: {e}")
                i += 1
        else:
            i += 1

    return SubtitleTrack(cues=cues, format="vtt")


def parse_srt(content: str) -> SubtitleTrack:
    """
    Parse SRT subtitle content.
    Returns a SubtitleTrack with all cues.
    """
    cues = []
    # Split by double newlines to get cue blocks
    blocks = re.split(r"\n\s*\n", content.strip())

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 2:
            continue

        try:
            # First line is index (may be missing)
            if lines[0].isdigit():
                index = int(lines[0])
                timestamp_line = lines[1]
                text_lines = lines[2:]
            else:
                # No index line
                index = len(cues) + 1
                timestamp_line = lines[0]
                text_lines = lines[1:]

            # Parse timestamp
            if "-->" in timestamp_line:
                parts = timestamp_line.split("-->")
                start_time = parse_timestamp_srt(parts[0].strip())
                end_time = parse_timestamp_srt(parts[1].strip())

                text = " ".join(line.strip() for line in text_lines)
                # Remove HTML tags
                text = re.sub(r"<[^>]+>", "", text)

                if text:
                    cues.append(
                        SubtitleCue(
                            index=index,
                            start_time=start_time,
                            end_time=end_time,
                            text=text,
                        )
                    )
        except Exception as e:
            print(f"Error parsing SRT block: {e}")
            continue

    return SubtitleTrack(cues=cues, format="srt")


def parse_subtitles(content: str, format: str = "vtt") -> SubtitleTrack:
    """Parse subtitle content based on format"""
    if format.lower() == "srt":
        return parse_srt(content)
    return parse_vtt(content)


async def fetch_subtitles(url: str) -> Optional[SubtitleTrack]:
    """
    Fetch and parse subtitles from a URL.
    Auto-detects format from URL or content.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text

            # Detect format
            if url.endswith(".srt") or not content.strip().startswith("WEBVTT"):
                format = "srt"
            else:
                format = "vtt"

            return parse_subtitles(content, format)

    except Exception as e:
        print(f"Error fetching subtitles from {url}: {e}")
        return None


def get_cue_at_time(track: SubtitleTrack, time: float) -> Optional[SubtitleCue]:
    """Get the subtitle cue active at a specific time"""
    for cue in track.cues:
        if cue.start_time <= time < cue.end_time:
            return cue
    return None


def get_cues_in_range(
    track: SubtitleTrack, start_time: float, end_time: float
) -> List[SubtitleCue]:
    """Get all cues within a time range"""
    return [
        cue
        for cue in track.cues
        if cue.start_time < end_time and cue.end_time > start_time
    ]


def extract_words(text: str) -> List[Dict[str, Any]]:
    """
    Extract individual words from subtitle text.
    Returns list of word info for tap-to-translate feature.
    """
    # Split on whitespace and punctuation, keeping positions
    words = []
    pattern = r"[\u0590-\u05FF\w]+"  # Hebrew and Latin word characters

    for match in re.finditer(pattern, text):
        word = match.group()
        words.append(
            {
                "word": word,
                "start": match.start(),
                "end": match.end(),
                "is_hebrew": bool(re.search(r"[\u0590-\u05FF]", word)),
            }
        )

    return words


def format_time(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS"""
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def cues_to_dict(cues: List[SubtitleCue]) -> List[Dict[str, Any]]:
    """Convert cues to dictionary format for API response"""
    return [
        {
            "index": cue.index,
            "start_time": cue.start_time,
            "end_time": cue.end_time,
            "text": cue.text,
            "text_nikud": cue.text_nikud,
            "formatted_start": format_time(cue.start_time),
            "formatted_end": format_time(cue.end_time),
            "words": extract_words(cue.text),
        }
        for cue in cues
    ]
