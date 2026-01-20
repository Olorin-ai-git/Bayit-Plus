"""
Search Helper Functions

Utility functions for vector search operations.
"""

import hashlib
from typing import List


def generate_vector_id(content_id: str, embedding_type: str, index: int) -> str:
    """
    Generate a unique vector ID.

    Args:
        content_id: Content document ID
        embedding_type: Type of embedding
        index: Segment index

    Returns:
        Unique vector ID hash
    """
    raw = f"{content_id}:{embedding_type}:{index}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def group_subtitles(subtitles: List[dict], segment_duration: float) -> List[dict]:
    """
    Group subtitles into time-based segments.

    Args:
        subtitles: List of subtitle dicts with start_time, end_time, text
        segment_duration: Target segment duration in seconds

    Returns:
        List of segment dicts
    """
    if not subtitles:
        return []

    segments = []
    current_segment = {
        "text": "",
        "start_time": subtitles[0].get("start_time", 0),
        "end_time": 0,
    }

    for sub in subtitles:
        start = sub.get("start_time", 0)
        end = sub.get("end_time", start)
        text = sub.get("text", "")

        # Check if we need to start a new segment
        if start - current_segment["start_time"] >= segment_duration:
            if current_segment["text"]:
                segments.append(current_segment)
            current_segment = {
                "text": text,
                "start_time": start,
                "end_time": end,
            }
        else:
            current_segment["text"] += " " + text
            current_segment["end_time"] = end

    # Add final segment
    if current_segment["text"]:
        segments.append(current_segment)

    return segments


def format_timestamp(seconds: float) -> str:
    """
    Format seconds as HH:MM:SS or MM:SS.

    Args:
        seconds: Time in seconds

    Returns:
        Formatted timestamp string
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"
