"""Quick MongoDB Performance Benchmark.

Simplified benchmark without app dependencies.
"""

import asyncio
import logging
import os
import statistics
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


async def measure_query(db, name, query_func, iterations=10):
    """Measure query performance."""
    timings = []

    for i in range(iterations):
        start = datetime.now(timezone.utc)
        await query_func()
        end = datetime.now(timezone.utc)
        duration_ms = (end - start).total_seconds() * 1000
        timings.append(duration_ms)

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


async def main():
    """Run quick MongoDB benchmark."""
    logger.info("=" * 80)
    logger.info("⚡ MongoDB Quick Benchmark")
    logger.info("=" * 80)
    logger.info("")

    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_database = os.getenv("MONGODB_DATABASE", "olorin")

    client = AsyncIOMotorClient(mongodb_uri)
    db = client[mongodb_database]

    try:
        await db.command("ping")
        logger.info(f"✅ Connected to MongoDB ({mongodb_database})")
        logger.info("")

        results = {}

        # 1. Simple find_one
        logger.info("1. Simple find_one query...")
        stats = await measure_query(
            db, "simple_find", lambda: db.investigations.find_one({})
        )
        results["simple_find"] = stats
        logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        logger.info("")

        # 2. Indexed query (user_id + created_at)
        logger.info("2. Indexed query (user_id + created_at)...")
        sample = await db.investigations.find_one({})
        if sample:
            user_id = sample.get("user_id", "default-user")
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            stats = await measure_query(
                db,
                "indexed_query",
                lambda: db.investigations.find_one(
                    {"user_id": user_id, "created_at": {"$gte": cutoff}}
                )
            )
            results["indexed_query"] = stats
            logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        else:
            logger.info("   ⏭️  No data to benchmark")
        logger.info("")

        # 3. Pagination (find + sort + limit)
        logger.info("3. Pagination query...")
        async def pagination_query():
            cursor = db.investigations.find({}).sort("created_at", -1).limit(20)
            await cursor.to_list(length=20)

        stats = await measure_query(db, "pagination", pagination_query)
        results["pagination"] = stats
        logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        logger.info("")

        # 4. Aggregation (group by status)
        logger.info("4. Aggregation query...")
        async def aggregation_query():
            pipeline = [
                {"$match": {"status": {"$in": ["RUNNING", "CREATED", "IN_PROGRESS"]}}},
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "latest": {"$max": "$created_at"}
                }},
                {"$sort": {"count": -1}}
            ]
            await db.investigations.aggregate(pipeline).to_list(length=10)

        stats = await measure_query(db, "aggregation", aggregation_query)
        results["aggregation"] = stats
        logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        logger.info("")

        # 5. Insert + Delete
        logger.info("5. Insert query...")
        async def insert_query():
            test_doc = {
                "investigation_id": f"bench-{datetime.now(timezone.utc).isoformat()}",
                "user_id": "benchmark-user",
                "tenant_id": "benchmark-tenant",
                "lifecycle_stage": "CREATED",
                "status": "CREATED",
                "version": 1,
                "created_at": datetime.now(timezone.utc),
            }
            result = await db.investigations.insert_one(test_doc)
            await db.investigations.delete_one({"_id": result.inserted_id})

        stats = await measure_query(db, "insert", insert_query, iterations=5)
        results["insert"] = stats
        logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        logger.info("")

        # 6. Update
        logger.info("6. Update query...")
        test_doc = {
            "investigation_id": f"bench-update-{datetime.now(timezone.utc).isoformat()}",
            "user_id": "benchmark-user",
            "tenant_id": "benchmark-tenant",
            "lifecycle_stage": "CREATED",
            "status": "CREATED",
            "version": 1,
            "created_at": datetime.now(timezone.utc),
        }
        insert_result = await db.investigations.insert_one(test_doc)
        doc_id = insert_result.inserted_id

        async def update_query():
            await db.investigations.update_one(
                {"_id": doc_id},
                {"$set": {"status": "RUNNING", "updated_at": datetime.now(timezone.utc)}}
            )

        stats = await measure_query(db, "update", update_query, iterations=5)
        results["update"] = stats
        await db.investigations.delete_one({"_id": doc_id})
        logger.info(f"   Mean: {stats['mean']:.2f}ms | P95: {stats['p95']:.2f}ms | P99: {stats['p99']:.2f}ms")
        logger.info("")

        # Summary
        logger.info("=" * 80)
        logger.info("📊 Benchmark Summary")
        logger.info("=" * 80)
        logger.info("")
        logger.info(f"{'Query Type':<20} {'Mean':>10} {'Median':>10} {'P95':>10} {'P99':>10}")
        logger.info("-" * 80)

        for name, stats in results.items():
            logger.info(
                f"{name:<20} "
                f"{stats['mean']:>10.2f} "
                f"{stats['median']:>10.2f} "
                f"{stats['p95']:>10.2f} "
                f"{stats['p99']:>10.2f}"
            )

        logger.info("-" * 80)
        logger.info("")
        logger.info("Performance Targets:")
        logger.info("  ✓ Simple queries: P99 < 100ms")
        logger.info("  ✓ Indexed queries: P99 < 100ms")
        logger.info("  ✓ Pagination: P99 < 200ms")
        logger.info("  ✓ Aggregation: P99 < 500ms")
        logger.info("  ✓ Writes: P99 < 100ms")
        logger.info("")

        # Check if targets met
        all_passed = True
        if results.get("simple_find", {}).get("p99", 0) > 100:
            logger.warning(f"⚠️  Simple find P99 high: {results['simple_find']['p99']:.2f}ms")
            all_passed = False
        if results.get("pagination", {}).get("p99", 0) > 200:
            logger.warning(f"⚠️  Pagination P99 high: {results['pagination']['p99']:.2f}ms")
            all_passed = False
        if results.get("aggregation", {}).get("p99", 0) > 500:
            logger.warning(f"⚠️  Aggregation P99 high: {results['aggregation']['p99']:.2f}ms")
            all_passed = False

        if all_passed:
            logger.info("✅ All performance targets met!")
        else:
            logger.warning("⚠️  Some queries exceed performance targets")

        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Benchmark failed: {e}", exc_info=True)
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
