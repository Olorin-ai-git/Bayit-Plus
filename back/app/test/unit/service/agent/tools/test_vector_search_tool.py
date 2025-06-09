"""
Tests for the vector search tool
"""

from unittest.mock import AsyncMock

import pytest

from app.service.agent.tools.vector_search_tool import (
    VectorSearchTool,
    distance_function,
)


class TestDistanceFunction:
    """Test the distance function with various transaction record scenarios."""

    def test_identical_records(self):
        """Test that identical records have zero distance."""
        record = {
            "tm_smart_id": "test_id",
            "tm_true_ip_geo": "US",
            "tm_true_ip": "192.168.1.1",
            "tm_proxy_ip": None,
            "rss_epoch_time": 1640995200000,  # 2022-01-01 00:00:00
            "tm_os_anomaly": "normal",
            "tm_http_os_signature": "windows",
            "tm_screen_color_depth": "32",
            "tm_agent_public_key_hash_type": "web:rsa",
            "tm_bb_bot_score": "100",
        }

        distance = distance_function(record, record)
        assert distance == 0.0

    def test_completely_different_records(self):
        """Test records with all different features."""
        record1 = {
            "tm_smart_id": "id1",
            "tm_true_ip_geo": "US",
            "tm_true_ip": "192.168.1.1",
            "tm_proxy_ip": None,
            "rss_epoch_time": 1640995200000,  # 2022-01-01 00:00:00
            "tm_os_anomaly": "normal",
            "tm_http_os_signature": "windows",
            "tm_screen_color_depth": "32",
            "tm_agent_public_key_hash_type": "web:rsa",
            "tm_bb_bot_score": "100",
        }

        record2 = {
            "tm_smart_id": "id2",
            "tm_true_ip_geo": "CA",
            "tm_true_ip": "192.168.1.2",
            "tm_proxy_ip": "proxy_ip",
            "rss_epoch_time": 1641081600000,  # 2022-01-02 00:00:00
            "tm_os_anomaly": "suspicious",
            "tm_http_os_signature": "mac",
            "tm_screen_color_depth": "24",
            "tm_agent_public_key_hash_type": "web:ecdsa",
            "tm_bb_bot_score": "600",
        }

        distance = distance_function(record1, record2)
        # Should be high distance due to many differences
        assert distance > 10

    def test_missing_fields(self):
        """Test records with missing fields."""
        record1 = {"tm_smart_id": "test_id"}
        record2 = {"tm_true_ip": "192.168.1.1"}

        distance = distance_function(record1, record2)
        # Should handle missing fields gracefully
        assert isinstance(distance, (int, float))
        assert distance >= 0

    def test_proxy_detection(self):
        """Test proxy detection logic."""
        record_no_proxy = {"tm_proxy_ip": None}
        record_with_proxy = {"tm_proxy_ip": "proxy_ip"}

        distance = distance_function(record_no_proxy, record_with_proxy)
        # Should include proxy distance (weight 2)
        assert distance >= 2

    def test_os_signature_matching(self):
        """Test OS signature matching."""
        windows_record = {"tm_http_os_signature": "windows 10"}
        mac_record = {"tm_http_os_signature": "mac os"}

        distance = distance_function(windows_record, mac_record)
        # Should include OS distance (weight 2)
        assert distance >= 2


class TestVectorSearchTool:
    """Test the VectorSearchTool class."""

    @pytest.fixture
    def tool(self):
        """Create a VectorSearchTool instance."""
        return VectorSearchTool()

    @pytest.fixture
    def sample_records(self):
        """Create sample transaction records for testing."""
        return [
            {
                "id": "record1",
                "tm_smart_id": "smart1",
                "tm_true_ip": "192.168.1.1",
                "tm_http_os_signature": "windows",
            },
            {
                "id": "record2",
                "tm_smart_id": "smart1",  # Same smart ID
                "tm_true_ip": "192.168.1.2",
                "tm_http_os_signature": "windows",
            },
            {
                "id": "record3",
                "tm_smart_id": "smart2",
                "tm_true_ip": "192.168.1.3",
                "tm_http_os_signature": "mac",
            },
        ]

    @pytest.mark.asyncio
    async def test_vector_search_basic(self, tool, sample_records):
        """Test basic vector search functionality."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = await tool._arun(target, candidates, max_results=5)

        assert "similar_records" in result
        assert "total_candidates" in result
        assert "total_results" in result
        assert result["total_candidates"] == 2
        assert len(result["similar_records"]) <= 5

    @pytest.mark.asyncio
    async def test_vector_search_with_threshold(self, tool, sample_records):
        """Test vector search with distance threshold."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = await tool._arun(target, candidates, distance_threshold=5.0)

        # All returned records should have distance <= 5.0
        for record in result["similar_records"]:
            assert record["distance"] <= 5.0

    @pytest.mark.asyncio
    async def test_vector_search_sorting(self, tool, sample_records):
        """Test that results are sorted by distance."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = await tool._arun(target, candidates)

        distances = [r["distance"] for r in result["similar_records"]]
        assert distances == sorted(distances)  # Should be sorted ascending

    @pytest.mark.asyncio
    async def test_vector_search_max_results(self, tool, sample_records):
        """Test max_results parameter."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = await tool._arun(target, candidates, max_results=1)

        assert len(result["similar_records"]) <= 1
        assert result["max_results"] == 1

    @pytest.mark.asyncio
    async def test_vector_search_empty_candidates(self, tool):
        """Test with empty candidate list."""
        target = {"tm_smart_id": "test"}
        candidates = []

        result = await tool._arun(target, candidates)

        assert result["total_candidates"] == 0
        assert result["total_results"] == 0
        assert len(result["similar_records"]) == 0

    @pytest.mark.asyncio
    async def test_vector_search_metadata(self, tool, sample_records):
        """Test metadata calculation."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = await tool._arun(target, candidates)

        assert "metadata" in result
        assert "distance_range" in result["metadata"]

        if result["similar_records"]:
            assert "min" in result["metadata"]["distance_range"]
            assert "max" in result["metadata"]["distance_range"]
            assert "avg" in result["metadata"]["distance_range"]

    def test_sync_run_wrapper(self, tool, sample_records):
        """Test the synchronous _run method wrapper."""
        target = sample_records[0]
        candidates = sample_records[1:]

        result = tool._run(target, candidates)

        assert isinstance(result, dict)
        assert "similar_records" in result

    @pytest.mark.asyncio
    async def test_error_handling(self, tool):
        """Test error handling with invalid input."""
        # Test with None as target record
        result = await tool._arun(None, [])

        assert "error" in result
        assert "Vector search failed" in result["error"]
