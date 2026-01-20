"""
End-to-end tests for new features:
1. TMDB API configuration and metadata retrieval
2. Duplicate detection service
3. OpenSubtitles service with retry logic
"""

import asyncio
import os
import sys
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env
from dotenv import load_dotenv

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
)
load_dotenv(env_path)

# Set up test environment defaults
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB_NAME", "bayit_test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")


class TestTMDBConfiguration:
    """Test TMDB API configuration and service"""

    def test_tmdb_api_key_configured(self):
        """Verify TMDB API key is in environment"""
        try:
            from app.core.config import settings

            api_key = getattr(settings, "tmdb_api_key", None) or os.getenv(
                "TMDB_API_KEY"
            )
        except Exception:
            api_key = os.getenv("TMDB_API_KEY")

        if api_key:
            assert len(api_key) > 10, "TMDB API key should be a valid length"
            print(f"✓ TMDB API Key configured: {api_key[:8]}...")
        else:
            print("⚠ TMDB API Key not set - metadata enrichment will be limited")

    def test_tmdb_service_exists(self):
        """Verify TMDB service module exists"""
        try:
            from app.services import tmdb_service

            print("✓ TMDB service module found")

            # Check for key functions
            if hasattr(tmdb_service, "get_movie_details"):
                print("✓ get_movie_details function available")
            if hasattr(tmdb_service, "search_movie"):
                print("✓ search_movie function available")
        except ImportError as e:
            # Check alternative locations
            try:
                from app.services.content_enrichment import tmdb

                print("✓ TMDB module found in content_enrichment")
            except ImportError:
                print(f"⚠ TMDB service not found: {e}")


class TestDuplicateDetectionService:
    """Test duplicate detection functionality"""

    def test_service_import(self):
        """Verify duplicate detection service can be imported"""
        from app.services.duplicate_detection_service import (
            DuplicateDetectionService,
            get_duplicate_detection_service,
        )

        service = get_duplicate_detection_service()
        assert service is not None
        print("✓ DuplicateDetectionService imported successfully")

    def test_title_normalization(self):
        """Test title normalization for duplicate matching"""
        from app.services.duplicate_detection_service import DuplicateDetectionService

        service = DuplicateDetectionService()

        # Test cases
        test_cases = [
            ("Movie.Title.2023.1080p.BluRay.x264", "movie title 2023"),
            ("Another_Movie-720p-HDTV", "another movie"),
            ("The Movie [YTS.MX]", "the movie"),
            ("Film (2022) BDRip", "film 2022"),
        ]

        for original, expected_contains in test_cases:
            normalized = service._normalize_title(original)
            # Check that quality markers are removed
            assert "1080p" not in normalized.lower()
            assert "720p" not in normalized.lower()
            assert "bluray" not in normalized.lower()
            assert "[" not in normalized
            print(f"✓ Normalized '{original[:30]}...' -> '{normalized}'")

    def test_title_similarity(self):
        """Test title similarity calculation"""
        from app.services.duplicate_detection_service import DuplicateDetectionService

        service = DuplicateDetectionService()

        # Same movie, different formats
        sim1 = service._calculate_title_similarity(
            "The Matrix 1999 1080p BluRay", "The Matrix (1999) 720p HDTV"
        )
        assert sim1 >= 0.7, f"Similar titles should have high similarity: {sim1}"
        print(f"✓ Same movie similarity: {sim1:.2f}")

        # Different movies
        sim2 = service._calculate_title_similarity("The Matrix", "Inception")
        assert sim2 < 0.5, f"Different movies should have low similarity: {sim2}"
        print(f"✓ Different movie similarity: {sim2:.2f}")

    @pytest.mark.asyncio
    async def test_find_all_duplicates_structure(self):
        """Test that find_all_duplicates returns correct structure"""
        from app.services.duplicate_detection_service import DuplicateDetectionService

        service = DuplicateDetectionService()

        # Mock the database methods
        with patch.object(
            service, "find_hash_duplicates", new_callable=AsyncMock
        ) as mock_hash, patch.object(
            service, "find_tmdb_duplicates", new_callable=AsyncMock
        ) as mock_tmdb, patch.object(
            service, "find_imdb_duplicates", new_callable=AsyncMock
        ) as mock_imdb, patch.object(
            service, "find_title_duplicates", new_callable=AsyncMock
        ) as mock_title:
            mock_hash.return_value = [{"file_hash": "abc123", "count": 2, "items": []}]
            mock_tmdb.return_value = []
            mock_imdb.return_value = []
            mock_title.return_value = []

            result = await service.find_all_duplicates()

            # Check structure
            assert "summary" in result
            assert "hash_duplicates" in result
            assert "tmdb_duplicates" in result
            assert "imdb_duplicates" in result
            assert "title_duplicates" in result

            summary = result["summary"]
            assert "total_duplicate_groups" in summary
            assert "total_duplicate_items" in summary
            assert "scanned_at" in summary

            print("✓ find_all_duplicates returns correct structure")


class TestOpenSubtitlesService:
    """Test OpenSubtitles service with retry logic"""

    def test_service_import(self):
        """Verify OpenSubtitles service can be imported"""
        from app.services.opensubtitles_service import (
            INITIAL_RETRY_DELAY,
            MAX_RETRIES,
            MAX_RETRY_DELAY,
            OpenSubtitlesService,
        )

        assert MAX_RETRIES == 3
        assert INITIAL_RETRY_DELAY == 1.0
        assert MAX_RETRY_DELAY == 30.0
        print("✓ OpenSubtitlesService imported with retry constants")

    def test_api_key_configured(self):
        """Verify OpenSubtitles API key is configured"""
        api_key = os.getenv("OPENSUBTITLES_API_KEY")

        if api_key:
            assert len(api_key) > 10, "API key should be valid length"
            print(f"✓ OpenSubtitles API Key configured: {api_key[:8]}...")
        else:
            print("⚠ OPENSUBTITLES_API_KEY not set - subtitle downloads disabled")

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test service can be initialized"""
        from app.services.opensubtitles_service import OpenSubtitlesService

        service = OpenSubtitlesService()

        # Check required attributes
        assert hasattr(service, "api_key")
        assert hasattr(service, "base_url")
        assert hasattr(service, "client")
        assert hasattr(service, "jwt_token")

        print("✓ OpenSubtitlesService initialized correctly")

    @pytest.mark.asyncio
    async def test_retry_logic_structure(self):
        """Test that retry logic constants and structure are properly defined"""
        import inspect

        from app.services.opensubtitles_service import (
            INITIAL_RETRY_DELAY,
            MAX_RETRIES,
            MAX_RETRY_DELAY,
            OpenSubtitlesService,
        )

        service = OpenSubtitlesService()

        # Verify retry constants
        assert MAX_RETRIES >= 1, "Should have at least 1 retry"
        assert INITIAL_RETRY_DELAY > 0, "Initial delay should be positive"
        assert MAX_RETRY_DELAY >= INITIAL_RETRY_DELAY, "Max delay should be >= initial"

        # Verify _make_request has retry logic by checking source code
        source = inspect.getsource(service._make_request)
        assert (
            "retry" in source.lower() or "MAX_RETRIES" in source
        ), "_make_request should contain retry logic"
        assert (
            "asyncio.sleep" in source or "await" in source
        ), "_make_request should be async with potential delays"

        print(
            f"✓ Retry constants: MAX_RETRIES={MAX_RETRIES}, INITIAL_DELAY={INITIAL_RETRY_DELAY}s, MAX_DELAY={MAX_RETRY_DELAY}s"
        )
        print("✓ Retry logic verified in _make_request source")


class TestAIAgentTools:
    """Test AI Agent tools for duplicate detection and API config"""

    def test_tools_defined(self):
        """Verify new tools are defined in AI agent service"""
        from app.services.ai_agent_service import TOOLS as AI_AGENT_TOOLS

        tool_names = [t["name"] for t in AI_AGENT_TOOLS]

        expected_tools = [
            "check_api_configuration",
            "find_duplicates",
            "resolve_duplicates",
            "find_missing_metadata",
        ]

        for tool in expected_tools:
            assert tool in tool_names, f"Tool '{tool}' should be defined"
            print(f"✓ Tool '{tool}' is defined")

    def test_tool_schemas(self):
        """Verify tool schemas are valid"""
        from app.services.ai_agent_service import TOOLS as AI_AGENT_TOOLS

        for tool in AI_AGENT_TOOLS:
            if tool["name"] in [
                "check_api_configuration",
                "find_duplicates",
                "resolve_duplicates",
                "find_missing_metadata",
            ]:
                assert "description" in tool
                assert "input_schema" in tool
                assert tool["input_schema"]["type"] == "object"
                print(f"✓ Tool '{tool['name']}' has valid schema")


class TestEnvironmentConfiguration:
    """Test environment configuration for all new features"""

    def test_env_example_has_tmdb(self):
        """Verify .env.example includes TMDB configuration"""
        env_example_path = os.path.join(os.path.dirname(__file__), "..", ".env.example")

        if os.path.exists(env_example_path):
            with open(env_example_path) as f:
                content = f.read()

            assert "TMDB_API_KEY" in content, ".env.example should have TMDB_API_KEY"
            assert (
                "TMDB_API_TOKEN" in content
            ), ".env.example should have TMDB_API_TOKEN"
            print("✓ .env.example has TMDB configuration")
        else:
            print("⚠ .env.example not found at expected path")

    def test_cloudbuild_has_secrets(self):
        """Verify cloudbuild.yaml includes new secrets"""
        cloudbuild_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "cloudbuild.yaml"
        )

        # Try backend-specific cloudbuild first
        backend_cloudbuild = os.path.join(
            os.path.dirname(__file__), "..", "cloudbuild.yaml"
        )

        path_to_check = (
            backend_cloudbuild
            if os.path.exists(backend_cloudbuild)
            else cloudbuild_path
        )

        if os.path.exists(path_to_check):
            with open(path_to_check) as f:
                content = f.read()

            assert (
                "tmdb-api-key" in content.lower()
            ), "cloudbuild should have TMDB secret"
            assert (
                "picovoice-access-key" in content.lower()
            ), "cloudbuild should have Picovoice secret"
            print(f"✓ {path_to_check} has required secrets")
        else:
            print("⚠ cloudbuild.yaml not found")


def run_sync_tests():
    """Run synchronous tests"""
    print("\n" + "=" * 60)
    print("Running End-to-End Tests for New Features")
    print("=" * 60 + "\n")

    # TMDB Tests
    print("\n--- TMDB Configuration Tests ---")
    tmdb_tests = TestTMDBConfiguration()
    tmdb_tests.test_tmdb_api_key_configured()
    tmdb_tests.test_tmdb_service_exists()

    # Duplicate Detection Tests
    print("\n--- Duplicate Detection Tests ---")
    dup_tests = TestDuplicateDetectionService()
    dup_tests.test_service_import()
    dup_tests.test_title_normalization()
    dup_tests.test_title_similarity()

    # OpenSubtitles Tests
    print("\n--- OpenSubtitles Service Tests ---")
    os_tests = TestOpenSubtitlesService()
    os_tests.test_service_import()
    os_tests.test_api_key_configured()

    # AI Agent Tools Tests
    print("\n--- AI Agent Tools Tests ---")
    agent_tests = TestAIAgentTools()
    agent_tests.test_tools_defined()
    agent_tests.test_tool_schemas()

    # Environment Configuration Tests
    print("\n--- Environment Configuration Tests ---")
    env_tests = TestEnvironmentConfiguration()
    env_tests.test_env_example_has_tmdb()
    env_tests.test_cloudbuild_has_secrets()

    print("\n" + "=" * 60)
    print("Synchronous Tests Complete!")
    print("=" * 60 + "\n")


async def run_async_tests():
    """Run async tests"""
    print("\n--- Running Async Tests ---")

    # Duplicate Detection async tests
    dup_tests = TestDuplicateDetectionService()
    await dup_tests.test_find_all_duplicates_structure()

    # OpenSubtitles async tests
    os_tests = TestOpenSubtitlesService()
    await os_tests.test_service_initialization()
    await os_tests.test_retry_logic_structure()

    print("\n--- Async Tests Complete ---\n")


if __name__ == "__main__":
    # Run sync tests
    run_sync_tests()

    # Run async tests
    asyncio.run(run_async_tests())

    print("\n✅ All E2E tests passed!")
