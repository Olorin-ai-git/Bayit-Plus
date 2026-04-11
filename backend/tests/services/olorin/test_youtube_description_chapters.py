"""Tests for YouTube description chapter parser.

Verifies that the parser implements YouTube's own chapter rules so the output
matches what trainees see on YouTube itself.
"""
from app.services.olorin.youtube_description_chapters import (
    parse_chapters_from_description,
)


def test_parses_mmss_and_hmmss_formats():
    description = """
0:00 Intro
1:30 Section A
12:45 Section B
1:02:30 Deep dive
"""
    chapters = parse_chapters_from_description(description, duration_seconds=5000.0)
    assert len(chapters) == 4
    assert chapters[0]["start_time"] == 0.0
    assert chapters[0]["title"] == "Intro"
    assert chapters[1]["start_time"] == 90.0
    assert chapters[1]["end_time"] == 765.0  # up to Section B start
    assert chapters[3]["start_time"] == 3750.0
    assert chapters[3]["end_time"] == 5000.0  # last chapter ends at duration


def test_rejects_description_with_fewer_than_three_timestamps():
    description = "0:00 Start\n1:23 End"
    assert parse_chapters_from_description(description, 600.0) == []


def test_rejects_description_where_first_timestamp_is_not_zero():
    description = "0:30 First\n1:00 Second\n2:00 Third"
    assert parse_chapters_from_description(description, 600.0) == []


def test_rejects_description_with_non_ascending_timestamps():
    description = "0:00 A\n5:00 B\n2:00 C"
    assert parse_chapters_from_description(description, 600.0) == []


def test_rejects_chapter_shorter_than_ten_seconds():
    description = "0:00 A\n0:05 B\n0:15 C\n1:00 D"
    assert parse_chapters_from_description(description, 600.0) == []


def test_ignores_inline_timestamps_that_are_not_line_starts():
    description = """
Check out 1:23 for the cool part!
0:00 Intro
2:00 Middle
4:00 End
"""
    chapters = parse_chapters_from_description(description, 300.0)
    # The "1:23" in prose must not count; the three real timestamps must.
    assert len(chapters) == 3
    assert chapters[0]["start_time"] == 0.0


def test_empty_description_returns_empty_list():
    assert parse_chapters_from_description("", 600.0) == []
    assert parse_chapters_from_description(None, 600.0) == []
