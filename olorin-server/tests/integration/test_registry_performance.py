"""
Registry Performance Tests

Tests SQLite registry performance for query latency, indexing speed, and scalability.
"""

import random
import string
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.service.investigation.workspace_registry import WorkspaceRegistry


class TestRegistryPerformance:
    """Test suite for registry performance"""

    def setup_method(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.registry_path = Path(self.temp_dir) / "test_registry.sqlite"
        self.registry = WorkspaceRegistry(registry_path=self.registry_path)

    def generate_random_entity_id(self, length=10):
        """Generate random entity ID for testing"""
        return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def test_index_investigation_performance(self):
        """Test investigation indexing performance"""
        num_investigations = 100

        start_time = time.time()

        for i in range(num_investigations):
            investigation_id = f"inv_{i:06d}"
            entity_type = random.choice(["email", "device_id", "ip"])
            entity_id = self.generate_random_entity_id()

            self.registry.index_investigation(
                investigation_id=investigation_id,
                title=f"Investigation {i}",
                investigation_type="structured",
                graph_type="clean",
                trigger_source=random.choice(["startup", "script", "ui"]),
                status="COMPLETED",
                entity_type=entity_type,
                entity_ids=[entity_id],
                canonical_path=f"workspace/investigations/2025/11/{investigation_id}",
                created_at=datetime.now() - timedelta(days=random.randint(0, 30)),
            )

        elapsed = time.time() - start_time
        throughput = num_investigations / elapsed

        # Should index at least 100 investigations per second
        assert throughput > 100, f"Indexing throughput too low: {throughput:.2f} inv/s"

        # Total time should be under 2 seconds for 100 investigations
        assert elapsed < 2.0, f"Indexing took too long: {elapsed:.2f}s"

    def test_query_by_entity_performance(self):
        """Test query by entity performance"""
        # Index multiple investigations for same entity
        entity_type = "email"
        entity_id = "test@example.com"
        num_investigations = 50

        for i in range(num_investigations):
            self.registry.index_investigation(
                investigation_id=f"inv_{i:06d}",
                title=f"Investigation {i}",
                entity_type=entity_type,
                entity_ids=[entity_id],
                canonical_path=f"workspace/investigations/2025/11/inv_{i:06d}",
                created_at=datetime.now() - timedelta(days=i),
            )

        # Query by entity
        start_time = time.time()
        results = self.registry.query_by_entity(entity_type, entity_id, limit=100)
        elapsed = time.time() - start_time

        assert len(results) == num_investigations
        # Query should complete in under 50ms (as per spec requirement)
        assert (
            elapsed < 0.05
        ), f"Query took too long: {elapsed*1000:.2f}ms (target: <50ms)"

    def test_query_by_date_range_performance(self):
        """Test query by date range performance"""
        # Index investigations across date range
        start_date = datetime.now() - timedelta(days=30)
        num_investigations = 100

        for i in range(num_investigations):
            created_at = start_date + timedelta(days=random.randint(0, 30))
            self.registry.index_investigation(
                investigation_id=f"inv_{i:06d}",
                title=f"Investigation {i}",
                canonical_path=f"workspace/investigations/2025/11/inv_{i:06d}",
                created_at=created_at,
            )

        # Query by date range
        query_start = datetime.now() - timedelta(days=15)
        query_end = datetime.now()

        start_time = time.time()
        results = self.registry.query_by_date_range(query_start, query_end, limit=100)
        elapsed = time.time() - start_time

        # Query should complete in under 50ms
        assert (
            elapsed < 0.05
        ), f"Date range query took too long: {elapsed*1000:.2f}ms (target: <50ms)"

    def test_full_text_search_performance(self):
        """Test full-text search performance"""
        # Index investigations with titles
        num_investigations = 100

        for i in range(num_investigations):
            self.registry.index_investigation(
                investigation_id=f"inv_{i:06d}",
                title=f"Investigation {i} - Test Title",
                tags=["test", "performance", f"tag_{i % 10}"],
                canonical_path=f"workspace/investigations/2025/11/inv_{i:06d}",
                created_at=datetime.now(),
            )

        # Full-text search
        start_time = time.time()
        results = self.registry.search_full_text("Test", limit=50)
        elapsed = time.time() - start_time

        # Full-text search should complete in under 100ms
        assert (
            elapsed < 0.1
        ), f"Full-text search took too long: {elapsed*1000:.2f}ms (target: <100ms)"

    def test_index_file_performance(self):
        """Test file indexing performance"""
        investigation_id = "inv_000001"

        # First index investigation
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="Test Investigation",
            canonical_path=f"workspace/investigations/2025/11/{investigation_id}",
        )

        num_files = 100

        start_time = time.time()

        for i in range(num_files):
            self.registry.index_file(
                investigation_id=investigation_id,
                canonical_path=f"workspace/investigations/2025/11/{investigation_id}/file_{i}.json",
                file_kind="artifact",
                file_ext="json",
                sha256_hash=f"hash_{i:064d}",
                file_size=1024 * (i + 1),
            )

        elapsed = time.time() - start_time
        throughput = num_files / elapsed

        # Should index at least 200 files per second
        assert (
            throughput > 200
        ), f"File indexing throughput too low: {throughput:.2f} files/s"

    def test_concurrent_queries_performance(self):
        """Test concurrent query performance"""
        # Index investigations
        num_investigations = 200

        for i in range(num_investigations):
            entity_type = random.choice(["email", "device_id", "ip"])
            entity_id = self.generate_random_entity_id()

            self.registry.index_investigation(
                investigation_id=f"inv_{i:06d}",
                title=f"Investigation {i}",
                entity_type=entity_type,
                entity_ids=[entity_id],
                canonical_path=f"workspace/investigations/2025/11/inv_{i:06d}",
                created_at=datetime.now() - timedelta(days=random.randint(0, 30)),
            )

        # Run concurrent queries
        import concurrent.futures

        def run_query():
            entity_type = random.choice(["email", "device_id", "ip"])
            return self.registry.query_by_entity(entity_type, limit=50)

        num_concurrent = 10
        start_time = time.time()

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=num_concurrent
        ) as executor:
            futures = [executor.submit(run_query) for _ in range(num_concurrent)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        elapsed = time.time() - start_time

        # All concurrent queries should complete in under 500ms
        assert elapsed < 0.5, f"Concurrent queries took too long: {elapsed*1000:.2f}ms"
        assert len(results) == num_concurrent

    def test_registry_size_tracking(self):
        """Test that registry size can be tracked"""
        # Index some data
        for i in range(50):
            self.registry.index_investigation(
                investigation_id=f"inv_{i:06d}",
                title=f"Investigation {i}",
                canonical_path=f"workspace/investigations/2025/11/inv_{i:06d}",
            )

        # Check registry file size
        registry_size = self.registry_path.stat().st_size

        # Registry should have some size
        assert registry_size > 0

        # Registry should be reasonably sized (under 10MB for 50 investigations)
        assert (
            registry_size < 10 * 1024 * 1024
        ), f"Registry too large: {registry_size / 1024 / 1024:.2f}MB"
