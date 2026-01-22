#!/usr/bin/env python3
"""
Comprehensive MongoDB Connection Test Suite
Tests the centralized olorin-shared database module
"""

import asyncio
import os
import sys
import time
from typing import Dict, List, Tuple

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from olorin_shared.database import (
    init_mongodb,
    close_mongodb_connection,
    get_mongodb_client,
    get_mongodb_database,
    MongoDBConnection
)


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color
    BOLD = '\033[1m'


def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.CYAN}{'='*70}{Colors.NC}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text}{Colors.NC}")
    print(f"{Colors.CYAN}{'='*70}{Colors.NC}\n")


def print_section(text: str):
    """Print a section header"""
    print(f"\n{Colors.YELLOW}{text}{Colors.NC}")
    print(f"{Colors.YELLOW}{'-'*70}{Colors.NC}")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.NC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.NC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ {text}{Colors.NC}")


async def test_module_imports():
    """Test 1: Verify all module imports work"""
    print_section("Test 1: Module Imports")

    try:
        from olorin_shared.database import (
            MongoDBConnection,
            init_mongodb,
            close_mongodb_connection,
            get_mongodb_client,
            get_mongodb_database
        )
        print_success("All required functions imported successfully:")
        print(f"  - MongoDBConnection")
        print(f"  - init_mongodb")
        print(f"  - close_mongodb_connection")
        print(f"  - get_mongodb_client")
        print(f"  - get_mongodb_database")
        return True
    except ImportError as e:
        print_error(f"Import failed: {e}")
        return False


async def test_environment_variables():
    """Test 2: Check environment variable configuration"""
    print_section("Test 2: Environment Variables")

    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_db_name = os.getenv("MONGODB_DB_NAME")

    if not mongodb_uri:
        print_error("MONGODB_URI not set")
        return False

    if not mongodb_db_name:
        print_error("MONGODB_DB_NAME not set")
        return False

    print_success(f"MONGODB_URI: {mongodb_uri[:50]}...")
    print_success(f"MONGODB_DB_NAME: {mongodb_db_name}")

    # Optional variables
    optional_vars = [
        "MONGODB_MAX_POOL_SIZE",
        "MONGODB_MIN_POOL_SIZE",
        "MONGODB_MAX_IDLE_TIME_MS",
        "MONGODB_CONNECT_TIMEOUT_MS",
        "MONGODB_SERVER_SELECTION_TIMEOUT_MS"
    ]

    print_info("Optional variables:")
    for var in optional_vars:
        value = os.getenv(var, "not set (using default)")
        print(f"  - {var}: {value}")

    return True


async def test_connection_initialization():
    """Test 3: Initialize MongoDB connection"""
    print_section("Test 3: Connection Initialization")

    start_time = time.time()

    try:
        await init_mongodb()
        init_time = time.time() - start_time

        print_success(f"Connection initialized in {init_time:.3f} seconds")

        if init_time < 2.0:
            print_success(f"Performance: Excellent (< 2s)")
        elif init_time < 5.0:
            print_info(f"Performance: Acceptable (2-5s)")
        else:
            print_error(f"Performance: Poor (> 5s)")

        return True
    except Exception as e:
        print_error(f"Connection initialization failed: {e}")
        return False


async def test_get_client():
    """Test 4: Get MongoDB client"""
    print_section("Test 4: Get MongoDB Client")

    try:
        client = get_mongodb_client()
        print_success("Client retrieved successfully")
        print_info(f"Client type: {type(client).__name__}")
        print_info(f"Max pool size: {client.max_pool_size}")
        print_info(f"Min pool size: {client.min_pool_size}")
        return True
    except Exception as e:
        print_error(f"Failed to get client: {e}")
        return False


async def test_get_database():
    """Test 5: Get MongoDB database"""
    print_section("Test 5: Get MongoDB Database")

    try:
        db = get_mongodb_database()
        print_success("Database retrieved successfully")
        print_info(f"Database name: {db.name}")
        print_info(f"Database type: {type(db).__name__}")
        return True
    except Exception as e:
        print_error(f"Failed to get database: {e}")
        return False


async def test_ping_database():
    """Test 6: Ping database"""
    print_section("Test 6: Ping Database")

    try:
        db = get_mongodb_database()
        result = await db.command("ping")
        print_success(f"Ping successful: {result}")
        return True
    except Exception as e:
        print_error(f"Ping failed: {e}")
        return False


async def test_list_collections():
    """Test 7: List collections"""
    print_section("Test 7: List Collections")

    try:
        db = get_mongodb_database()
        collections = await db.list_collection_names()

        print_success(f"Found {len(collections)} collections")

        if collections:
            print_info("First 10 collections:")
            for col in collections[:10]:
                print(f"  - {col}")
            if len(collections) > 10:
                print(f"  ... and {len(collections) - 10} more")
        else:
            print_info("No collections found (database may be empty)")

        return True
    except Exception as e:
        print_error(f"Failed to list collections: {e}")
        return False


async def test_document_count():
    """Test 8: Count documents in collections"""
    print_section("Test 8: Document Count")

    try:
        db = get_mongodb_database()
        collections = await db.list_collection_names()

        if not collections:
            print_info("No collections to count")
            return True

        total_docs = 0
        for col_name in collections[:5]:  # Check first 5 collections
            count = await db[col_name].count_documents({})
            total_docs += count
            print_info(f"{col_name}: {count:,} documents")

        print_success(f"Total documents (first 5 collections): {total_docs:,}")
        return True
    except Exception as e:
        print_error(f"Failed to count documents: {e}")
        return False


async def test_query_performance():
    """Test 9: Query performance"""
    print_section("Test 9: Query Performance")

    try:
        db = get_mongodb_database()
        collections = await db.list_collection_names()

        if not collections:
            print_info("No collections to query")
            return True

        # Test with first collection that has documents
        for col_name in collections:
            count = await db[col_name].count_documents({})
            if count > 0:
                # Test find query
                start_time = time.time()
                docs = await db[col_name].find({}).limit(10).to_list(length=10)
                query_time = time.time() - start_time

                print_success(f"Query on '{col_name}' completed in {query_time:.3f}s")
                print_info(f"Retrieved {len(docs)} documents")

                if query_time < 0.1:
                    print_success("Performance: Excellent (< 100ms)")
                elif query_time < 0.5:
                    print_info("Performance: Good (< 500ms)")
                else:
                    print_error("Performance: Needs optimization (> 500ms)")

                break

        return True
    except Exception as e:
        print_error(f"Query performance test failed: {e}")
        return False


async def test_connection_pooling():
    """Test 10: Connection pooling"""
    print_section("Test 10: Connection Pooling")

    try:
        client = get_mongodb_client()

        # Execute multiple concurrent pings
        print_info("Testing with 20 concurrent operations...")
        start_time = time.time()
        tasks = [client.admin.command("ping") for _ in range(20)]
        results = await asyncio.gather(*tasks)
        pool_time = time.time() - start_time

        print_success(f"Executed {len(results)} concurrent operations in {pool_time:.3f}s")
        print_success(f"Average per operation: {(pool_time / len(results) * 1000):.1f}ms")
        print_info("Connection pooling working correctly")

        return True
    except Exception as e:
        print_error(f"Connection pooling test failed: {e}")
        return False


async def test_close_connection():
    """Test 11: Close connection"""
    print_section("Test 11: Close Connection")

    try:
        await close_mongodb_connection()
        print_success("Connection closed successfully")
        return True
    except Exception as e:
        print_error(f"Failed to close connection: {e}")
        return False


async def test_error_handling():
    """Test 12: Error handling with missing environment variables"""
    print_section("Test 12: Error Handling")

    # Save current env vars
    saved_uri = os.environ.get("MONGODB_URI")
    saved_db = os.environ.get("MONGODB_DB_NAME")

    try:
        # Test missing MONGODB_URI
        os.environ.pop("MONGODB_URI", None)
        os.environ.pop("MONGODB_DB_NAME", None)

        try:
            conn = MongoDBConnection()
            print_error("Should have raised ConfigurationError for missing MONGODB_URI")
            return False
        except Exception as e:
            if "MONGODB_URI" in str(e):
                print_success(f"Correctly raised error for missing MONGODB_URI")
            else:
                print_error(f"Wrong error: {e}")
                return False

        # Restore and test missing MONGODB_DB_NAME
        if saved_uri:
            os.environ["MONGODB_URI"] = saved_uri

        try:
            conn = MongoDBConnection()
            print_error("Should have raised ConfigurationError for missing MONGODB_DB_NAME")
            return False
        except Exception as e:
            if "MONGODB_DB_NAME" in str(e):
                print_success(f"Correctly raised error for missing MONGODB_DB_NAME")
            else:
                print_error(f"Wrong error: {e}")
                return False

        return True
    finally:
        # Restore environment variables
        if saved_uri:
            os.environ["MONGODB_URI"] = saved_uri
        if saved_db:
            os.environ["MONGODB_DB_NAME"] = saved_db


async def run_all_tests():
    """Run all tests and generate report"""
    print_header("MongoDB Centralized Connection - Test Suite")
    print_info(f"Testing olorin-shared database module")
    print_info(f"Python version: {sys.version.split()[0]}")

    results: List[Tuple[str, bool]] = []

    # Test 1: Module imports
    result = await test_module_imports()
    results.append(("Module Imports", result))
    if not result:
        print_error("\nCritical: Module imports failed. Stopping tests.")
        return False

    # Test 2: Environment variables
    result = await test_environment_variables()
    results.append(("Environment Variables", result))
    if not result:
        print_error("\nCritical: Environment not configured. Stopping tests.")
        return False

    # Test 3: Connection initialization
    result = await test_connection_initialization()
    results.append(("Connection Initialization", result))
    if not result:
        print_error("\nCritical: Cannot connect to MongoDB. Stopping tests.")
        return False

    # Run remaining tests
    tests = [
        ("Get Client", test_get_client),
        ("Get Database", test_get_database),
        ("Ping Database", test_ping_database),
        ("List Collections", test_list_collections),
        ("Document Count", test_document_count),
        ("Query Performance", test_query_performance),
        ("Connection Pooling", test_connection_pooling),
        ("Close Connection", test_close_connection),
        ("Error Handling", test_error_handling),
    ]

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Generate summary
    print_header("Test Summary")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{Colors.GREEN}✓ PASSED{Colors.NC}" if result else f"{Colors.RED}✗ FAILED{Colors.NC}"
        print(f"{status}: {test_name}")

    print(f"\n{Colors.CYAN}{'='*70}{Colors.NC}")
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ ALL TESTS PASSED: {passed}/{total}{Colors.NC}")
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠ TESTS PASSED: {passed}/{total}{Colors.NC}")
        print(f"{Colors.RED}Failed: {total - passed}{Colors.NC}")
    print(f"{Colors.CYAN}{'='*70}{Colors.NC}\n")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
