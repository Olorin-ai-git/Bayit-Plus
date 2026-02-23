"""
Subtitle cue validation checks.

Validates cue sequences for index order, timing, overlaps, gaps,
duration sanity, and empty text.
"""

_CUE_MAX_DURATION_S = 15.0
_CUE_MIN_DURATION_S = 0.1
_OVERLAP_TOLERANCE_S = 0.5
_GAP_WARNING_S = 300.0


def validate_cues(cues: list[dict]) -> list[str]:
    """Run all validation checks on subtitle cues. Returns list of issues."""
    issues: list[str] = []
    if not cues:
        issues.append("no cues found")
        return issues

    indices = [c["index"] for c in cues]
    expected = list(range(indices[0], indices[0] + len(indices)))
    if indices != expected:
        issues.append(
            f"index sequence broken: got {len(indices)} cues, "
            f"expected sequential from {indices[0]}"
        )

    for i, cue in enumerate(cues):
        st, et = cue["start_time"], cue["end_time"]
        idx = cue["index"]
        if st < 0:
            issues.append(f"cue {idx}: negative start_time {st}")
        if st >= et:
            issues.append(f"cue {idx}: start_time ({st}) >= end_time ({et})")

        dur = et - st
        if dur > _CUE_MAX_DURATION_S:
            issues.append(f"cue {idx}: duration {dur:.1f}s exceeds {_CUE_MAX_DURATION_S}s")
        if dur < _CUE_MIN_DURATION_S:
            issues.append(f"cue {idx}: duration {dur:.3f}s below {_CUE_MIN_DURATION_S}s")

        text = cue.get("text", "")
        if not text or not text.strip():
            issues.append(f"cue {idx}: empty text")

        if i > 0:
            prev = cues[i - 1]
            if st < prev["start_time"]:
                issues.append(
                    f"cue {idx}: not monotonic "
                    f"(start {st} < prev start {prev['start_time']})"
                )

            overlap = prev["end_time"] - st
            if overlap > _OVERLAP_TOLERANCE_S:
                issues.append(f"cue {idx}: overlap {overlap:.2f}s with previous")

            gap = st - prev["end_time"]
            if gap > _GAP_WARNING_S:
                issues.append(f"cue {idx}: gap {gap:.0f}s from previous")

    return issues


def compute_coverage(cues: list[dict], duration_str: str | None) -> float | None:
    """
    Compute subtitle coverage as a percentage of content duration.
    Returns None if duration cannot be parsed.
    """
    if not cues or not duration_str:
        return None

    first_start = cues[0]["start_time"]
    last_end = cues[-1]["end_time"]
    subtitle_span = last_end - first_start

    try:
        parts = duration_str.split(":")
        if len(parts) == 3:
            content_dur = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            content_dur = int(parts[0]) * 60 + float(parts[1])
        else:
            content_dur = float(parts[0])
        if content_dur <= 0:
            return None
        return subtitle_span / content_dur * 100
    except (ValueError, IndexError):
        return None
