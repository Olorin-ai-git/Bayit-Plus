"""Tests for department-level analytics aggregation."""

import pytest
from app.api.routes.training.progress import _aggregate_departments


def test_aggregate_by_department():
    """Group employees by department with stats."""
    employees = [
        {
            "user_id": "u1", "display_name": "Alice", "department": "Engineering",
            "videos_started": 5, "videos_completed": 4,
            "avg_quiz_score": 0.8, "total_watch_time_seconds": 3600,
        },
        {
            "user_id": "u2", "display_name": "Bob", "department": "Engineering",
            "videos_started": 3, "videos_completed": 2,
            "avg_quiz_score": 0.6, "total_watch_time_seconds": 1800,
        },
        {
            "user_id": "u3", "display_name": "Carol", "department": None,
            "videos_started": 1, "videos_completed": 0,
            "avg_quiz_score": None, "total_watch_time_seconds": 600,
        },
    ]

    result = _aggregate_departments(employees)

    assert len(result) == 2
    eng = next(d for d in result if d["name"] == "Engineering")
    assert eng["employee_count"] == 2
    assert eng["videos_completed"] == 6
    assert eng["avg_quiz_score"] == pytest.approx(0.7, abs=0.01)
    assert eng["total_watch_time_seconds"] == 5400

    unassigned = next(d for d in result if d["name"] == "Unassigned")
    assert unassigned["employee_count"] == 1
    assert unassigned["avg_quiz_score"] is None


def test_aggregate_empty():
    """Empty employee list returns empty departments."""
    assert _aggregate_departments([]) == []


def test_aggregate_all_same_department():
    """All employees in same department."""
    employees = [
        {
            "user_id": "u1", "display_name": "A", "department": "Sales",
            "videos_started": 2, "videos_completed": 1,
            "avg_quiz_score": 0.9, "total_watch_time_seconds": 1000,
        },
        {
            "user_id": "u2", "display_name": "B", "department": "Sales",
            "videos_started": 3, "videos_completed": 3,
            "avg_quiz_score": 0.7, "total_watch_time_seconds": 2000,
        },
    ]

    result = _aggregate_departments(employees)
    assert len(result) == 1
    assert result[0]["name"] == "Sales"
    assert result[0]["employee_count"] == 2
    assert result[0]["videos_started"] == 5
