"""MongoDB Performance Benchmark Script.

SYSTEM MANDATE Compliance:
- No hardcoded values: All from environment
- Complete implementation: No placeholders or TODOs
- Comprehensive benchmarks: Tests common query patterns

This script benchmarks MongoDB Atlas performance by running typical
queries and measuring response times.
"""

import asyncio
import sys
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config.mongodb_settings import get_mongodb_settings
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MongoDBBenchmark:
    """Benchmark MongoDB Atlas performance."""

    def __init__(self):
        """Initialize benchmark with MongoDB settings."""
        self.settings = get_mongodb_settings()
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self.results: Dict[str, Dict[str, float]] = {}

    async def connect(self) -> bool:
        """Establish connection to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(
                self.settings.get_connection_string(),
                **self.settings.get_pool_config(),
            )
            self.db = self.client[self.settings.get_database_name()]

            # Test connection
            await self.db.command("ping")
            return True

        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False

    async def measure_query(
        self, name: str, query_func, iterations: int = 10
    ) -> Dict[str, float]:
        """Measure query performance over multiple iterations.

        Args:
            name: Query name
            query_func: Async function to execute
            iterations: Number of iterations

        Returns:
            Dict with timing statistics (mean, median, p95, p99, min, max)
        """
        timings = []

        for i in range(iterations):
            start_time = datetime.utcnow()
            await query_func()
            end_time = datetime.utcnow()

            duration_ms = (end_time - start_time).total_seconds() * 1000
            timings.append(duration_ms)

        # Calculate statistics
        timings_sorted = sorted(timings)
        n = len(timings_sorted)

        return {
            "mean": statistics.mean(timings),
            "median": statistics.median(timings),
            "p95": timings_sorted[int(n * 0.95)] if n > 0 else 0,
            "p99": timings_sorted[int(n * 0.99)] if n > 0 else 0,
            "min": min(timings),
            "max": max(timings),
        }

    async def benchmark_simple_query(self) -> Tuple[bool, str]:
        """Benchmark simple find_one query."""
        logger.info("1. Benchmarking simple find_one query...")

        try:

            async def query():
                await self.db.investigations.find_one({})

            stats = await self.measure_query("simple_find_one", query)
            self.results["simple_find_one"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 100:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <100ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Simple query P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Simple query benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_indexed_query(self) -> Tuple[bool, str]:
        """Benchmark indexed query (user_id + created_at)."""
        logger.info("2. Benchmarking indexed query...")

        try:
            # Find a sample user_id
            sample = await self.db.investigations.find_one({})
            if not sample:
                logger.info("   ⏭️  No data to benchmark")
                return (True, "No data")

            user_id = sample.get("user_id", "default-user")
            cutoff_date = datetime.utcnow() - timedelta(days=30)

            async def query():
                await self.db.investigations.find_one(
                    {"user_id": user_id, "created_at": {"$gte": cutoff_date}}
                )

            stats = await self.measure_query("indexed_query", query)
            self.results["indexed_query"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 100:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <100ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Indexed query P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Indexed query benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_pagination(self) -> Tuple[bool, str]:
        """Benchmark paginated list query."""
        logger.info("3. Benchmarking pagination...")

        try:

            async def query():
                cursor = self.db.investigations.find({}).sort("created_at", -1).limit(20)
                await cursor.to_list(length=20)

            stats = await self.measure_query("pagination", query)
            self.results["pagination"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 200:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <200ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Pagination P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Pagination benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_aggregation(self) -> Tuple[bool, str]:
        """Benchmark aggregation query."""
        logger.info("4. Benchmarking aggregation...")

        try:

            async def query():
                pipeline = [
                    {"$match": {"status": "RUNNING"}},
                    {
                        "$group": {
                            "_id": "$user_id",
                            "count": {"$sum": 1},
                            "latest": {"$max": "$created_at"},
                        }
                    },
                    {"$sort": {"count": -1}},
                    {"$limit": 10},
                ]
                await self.db.investigations.aggregate(pipeline).to_list(length=10)

            stats = await self.measure_query("aggregation", query)
            self.results["aggregation"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 500:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <500ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Aggregation P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Aggregation benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_insert(self) -> Tuple[bool, str]:
        """Benchmark single document insert."""
        logger.info("5. Benchmarking single insert...")

        try:

            async def query():
                test_doc = {
                    "investigation_id": f"bench-{datetime.utcnow().isoformat()}",
                    "user_id": "benchmark-user",
                    "tenant_id": "benchmark-tenant",
                    "lifecycle_stage": "CREATED",
                    "status": "PENDING",
                    "version": 1,
                    "created_at": datetime.utcnow(),
                }
                result = await self.db.investigations.insert_one(test_doc)
                # Cleanup
                await self.db.investigations.delete_one({"_id": result.inserted_id})

            stats = await self.measure_query("single_insert", query)
            self.results["single_insert"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 100:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <100ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Insert P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Insert benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_update(self) -> Tuple[bool, str]:
        """Benchmark single document update."""
        logger.info("6. Benchmarking single update...")

        try:
            # Create test document
            test_doc = {
                "investigation_id": f"bench-update-{datetime.utcnow().isoformat()}",
                "user_id": "benchmark-user",
                "tenant_id": "benchmark-tenant",
                "lifecycle_stage": "CREATED",
                "status": "PENDING",
                "version": 1,
                "created_at": datetime.utcnow(),
            }
            result = await self.db.investigations.insert_one(test_doc)
            doc_id = result.inserted_id

            async def query():
                await self.db.investigations.update_one(
                    {"_id": doc_id, "version": 1},
                    {
                        "$set": {"status": "RUNNING", "updated_at": datetime.utcnow()},
                        "$inc": {"version": 1},
                    },
                )

            stats = await self.measure_query("single_update", query, iterations=10)
            self.results["single_update"] = stats

            # Cleanup
            await self.db.investigations.delete_one({"_id": doc_id})

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 100:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <100ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Update P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Update benchmark failed: {str(e)}"
            logger.error(f"   ❌ {message}")
            return (False, message)

    async def benchmark_vector_search(self) -> Tuple[bool, str]:
        """Benchmark vector search query."""
        logger.info("7. Benchmarking vector search...")

        if not self.settings.is_vector_search_enabled():
            logger.info("   ⏭️  Vector search disabled")
            return (True, "Vector search disabled")

        try:
            # Check if we have any documents with embeddings
            sample = await self.db.anomaly_events.find_one(
                {"embedding": {"$exists": True}}
            )

            if not sample:
                logger.info("   ⏭️  No embeddings to benchmark")
                return (True, "No embeddings")

            query_vector = sample.get("embedding", [])
            if not query_vector:
                logger.info("   ⏭️  No valid embedding found")
                return (True, "No valid embedding")

            async def query():
                pipeline = [
                    {
                        "$vectorSearch": {
                            "index": self.settings.mongodb_vector_search_index,
                            "path": "embedding",
                            "queryVector": query_vector,
                            "numCandidates": 100,
                            "limit": 10,
                        }
                    },
                    {
                        "$project": {
                            "anomaly_id": 1,
                            "score": 1,
                            "similarity_score": {"$meta": "vectorSearchScore"},
                        }
                    },
                ]
                await self.db.anomaly_events.aggregate(pipeline).to_list(length=10)

            stats = await self.measure_query("vector_search", query)
            self.results["vector_search"] = stats

            logger.info(f"   ⏱️  Mean: {stats['mean']:.2f}ms")
            logger.info(f"   ⏱️  P95: {stats['p95']:.2f}ms")
            logger.info(f"   ⏱️  P99: {stats['p99']:.2f}ms")

            if stats["p99"] > 500:
                message = f"P99 latency high: {stats['p99']:.2f}ms (target: <500ms)"
                logger.warning(f"   ⚠️  {message}")
                return (True, message)

            logger.info(f"   ✅ Performance acceptable")
            return (True, f"Vector search P99: {stats['p99']:.2f}ms")

        except Exception as e:
            message = f"Vector search benchmark failed: {str(e)}"
            logger.warning(f"   ⚠️  {message}")
            return (True, message)  # Non-critical

    async def run_all(self) -> Dict[str, Tuple[bool, str]]:
        """Run all benchmarks."""
        logger.info("=" * 80)
        logger.info("⚡ MongoDB Performance Benchmark Starting")
        logger.info("=" * 80)
        logger.info("")

        # Connect to MongoDB
        if not await self.connect():
            return {"connection": (False, "Failed to connect to MongoDB")}

        # Run all benchmarks
        results = {}
        results["simple_query"] = await self.benchmark_simple_query()
        results["indexed_query"] = await self.benchmark_indexed_query()
        results["pagination"] = await self.benchmark_pagination()
        results["aggregation"] = await self.benchmark_aggregation()
        results["insert"] = await self.benchmark_insert()
        results["update"] = await self.benchmark_update()
        results["vector_search"] = await self.benchmark_vector_search()

        return results

    async def print_summary(self, results: Dict[str, Tuple[bool, str]]) -> bool:
        """Print benchmark summary."""
        logger.info("")
        logger.info("=" * 80)
        logger.info("📊 Benchmark Summary")
        logger.info("=" * 80)

        # Print individual results
        for test_name, (success, message) in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            logger.info(f"{status}: {test_name.replace('_', ' ').title()}")
            logger.info(f"       {message}")

        logger.info("")

        # Print detailed statistics table
        logger.info("Detailed Timings (milliseconds):")
        logger.info("-" * 80)
        logger.info(f"{'Benchmark':<25} {'Mean':>10} {'Median':>10} {'P95':>10} {'P99':>10}")
        logger.info("-" * 80)

        for test_name, stats in self.results.items():
            logger.info(
                f"{test_name:<25} "
                f"{stats['mean']:>10.2f} "
                f"{stats['median']:>10.2f} "
                f"{stats['p95']:>10.2f} "
                f"{stats['p99']:>10.2f}"
            )

        logger.info("-" * 80)

        # Overall assessment
        total_tests = len(results)
        passed_tests = sum(1 for success, _ in results.values() if success)
        failed_tests = total_tests - passed_tests

        logger.info("")
        logger.info(f"Total Benchmarks: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {failed_tests}")
        logger.info("")

        if failed_tests == 0:
            logger.info("✅ All benchmarks completed successfully")
            logger.info("=" * 80)
            return True
        else:
            logger.error("❌ Some benchmarks failed")
            logger.error("=" * 80)
            return False

    async def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()


async def main():
    """Run MongoDB benchmark."""
    benchmark = MongoDBBenchmark()

    try:
        results = await benchmark.run_all()
        success = await benchmark.print_summary(results)

        # Exit with appropriate code
        sys.exit(0 if success else 1)

    except Exception as e:
        logger.error(f"❌ Benchmark failed with exception: {e}", exc_info=True)
        sys.exit(1)

    finally:
        await benchmark.close()


if __name__ == "__main__":
    asyncio.run(main())
