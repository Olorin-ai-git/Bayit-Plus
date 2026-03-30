"""Unit tests for priority mapping."""

import pytest


class TestTierToPriority:
    def test_b2b_highest_priority(self):
        from app.utils.priority_utils import tier_to_priority
        assert tier_to_priority("b2b") == 0

    def test_superfan_priority(self):
        from app.utils.priority_utils import tier_to_priority
        assert tier_to_priority("superfan") == 3

    def test_fan_priority(self):
        from app.utils.priority_utils import tier_to_priority
        assert tier_to_priority("fan") == 5

    def test_free_lowest_priority(self):
        from app.utils.priority_utils import tier_to_priority
        assert tier_to_priority("free") == 10

    def test_unknown_tier_defaults_to_free(self):
        from app.utils.priority_utils import tier_to_priority
        assert tier_to_priority("unknown") == 10
        assert tier_to_priority("") == 10


class TestShouldProcessImmediately:
    def test_b2b_immediate(self):
        from app.utils.priority_utils import should_process_immediately
        assert should_process_immediately("b2b") is True

    def test_superfan_immediate(self):
        from app.utils.priority_utils import should_process_immediately
        assert should_process_immediately("superfan") is True

    def test_fan_immediate(self):
        from app.utils.priority_utils import should_process_immediately
        assert should_process_immediately("fan") is True

    def test_free_queued(self):
        from app.utils.priority_utils import should_process_immediately
        assert should_process_immediately("free") is False

    def test_unknown_queued(self):
        from app.utils.priority_utils import should_process_immediately
        assert should_process_immediately("") is False
