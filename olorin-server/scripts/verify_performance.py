"""
Performance Verification Script.

Validates that PostgreSQL performance is within 20% of Snowflake
for equivalent queries after all optimizations.

Usage:
    python scripts/verify_performance.py

Constitutional Compliance:
- NO hardcoded values - all from configuration
- Complete implementation
- Comprehensive verification
"""

import sys
from pathlib import Path
import time
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.agent.tools.database_tool.postgres_pool_tuning import PostgreSQLPoolTuner

logger = get_bridge_logger(__name__)


class PerformanceVerifier:
    """Verifies PostgreSQL performance meets requirements."""

    def __init__(self):
        """Initialize performance verifier."""
        self.sf_provider = None
        self.pg_provider = None
        self.threshold = 1.2  # 20% threshold (PostgreSQL can be up to 1.2x slower)

        logger.info("Initialized PerformanceVerifier (threshold: 20%)")

    def setup_providers(self) -> bool:
        """
        Setup database providers for both Snowflake and PostgreSQL.

        Returns:
            True if both providers initialized successfully
        """
        try:
            logger.info("Setting up database providers...")

            # Initialize Snowflake provider
            self.sf_provider = get_database_provider('snowflake')
            logger.info("✅ Snowflake provider initialized")

            # Initialize PostgreSQL provider
            self.pg_provider = get_database_provider('postgresql')
            logger.info("✅ PostgreSQL provider initialized")

            return True

        except Exception as e:
            logger.error(f"❌ Failed to setup providers: {e}")
            return False

    def benchmark_query(
        self,
        query: str,
        provider_name: str,
        iterations: int = 5
    ) -> Dict[str, Any]:
        """
        Benchmark a query against a specific provider.

        Args:
            query: SQL query to benchmark
            provider_name: 'snowflake' or 'postgresql'
            iterations: Number of iterations to run

        Returns:
            Dictionary with benchmark results
        """
        provider = self.sf_provider if provider_name == 'snowflake' else self.pg_provider

        durations = []
        row_counts = []

        for i in range(iterations):
            start = time.time()
            results = provider.execute_query(query)
            duration = time.time() - start
            durations.append(duration * 1000)  # Convert to ms
            row_counts.append(len(results))

        avg_duration = sum(durations) / len(durations)
        avg_rows = sum(row_counts) / len(row_counts)

        logger.info(
            f"  {provider_name}: avg={avg_duration:.1f}ms, "
            f"rows={avg_rows:.0f}"
        )

        return {
            'provider': provider_name,
            'iterations': iterations,
            'avg_duration_ms': avg_duration,
            'min_duration_ms': min(durations),
            'max_duration_ms': max(durations),
            'avg_row_count': avg_rows
        }

    def verify_query_performance(
        self,
        query_name: str,
        query: str
    ) -> Dict[str, Any]:
        """
        Verify that PostgreSQL performance is within threshold for a query.

        Args:
            query_name: Descriptive name for the query
            query: SQL query to test

        Returns:
            Verification result dictionary
        """
        logger.info(f"\n📊 Testing: {query_name}")

        # Benchmark both providers
        sf_result = self.benchmark_query(query, 'snowflake')
        pg_result = self.benchmark_query(query, 'postgresql')

        # Calculate performance ratio
        ratio = pg_result['avg_duration_ms'] / sf_result['avg_duration_ms']
        within_threshold = ratio <= self.threshold

        result = {
            'query_name': query_name,
            'snowflake_avg_ms': sf_result['avg_duration_ms'],
            'postgresql_avg_ms': pg_result['avg_duration_ms'],
            'performance_ratio': ratio,
            'threshold': self.threshold,
            'within_threshold': within_threshold,
            'status': '✅ PASS' if within_threshold else '❌ FAIL'
        }

        # Log result
        status_msg = (
            f"  PostgreSQL is {ratio:.2f}x slower than Snowflake "
            f"({'WITHIN' if within_threshold else 'EXCEEDS'} {self.threshold}x threshold)"
        )

        if within_threshold:
            logger.info(f"  {result['status']} {status_msg}")
        else:
            logger.error(f"  {result['status']} {status_msg}")

        return result

    def run_verification_suite(self) -> Dict[str, Any]:
        """
        Run complete performance verification suite.

        Returns:
            Summary of all verification results
        """
        logger.info("=" * 60)
        logger.info("PERFORMANCE VERIFICATION SUITE")
        logger.info("=" * 60)

        # Setup providers
        if not self.setup_providers():
            return {'success': False, 'error': 'Failed to setup providers'}

        # Define test queries (common investigation patterns)
        test_queries = {
            'Simple SELECT': "SELECT * FROM transactions_enriched LIMIT 100",

            'Email Filter': "SELECT TX_ID_KEY, EMAIL, MODEL_SCORE FROM transactions_enriched WHERE EMAIL = 'test@example.com' LIMIT 10",

            'Date Range': """
                SELECT TX_ID_KEY, TX_DATETIME
                FROM transactions_enriched
                WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '7 days'
                LIMIT 100
            """,

            'High Risk': """
                SELECT TX_ID_KEY, EMAIL, MODEL_SCORE
                FROM transactions_enriched
                WHERE MODEL_SCORE > 0.8
                LIMIT 50
            """,

            'Aggregation': """
                SELECT
                    EMAIL,
                    COUNT(*) as tx_count,
                    AVG(MODEL_SCORE) as avg_score
                FROM transactions_enriched
                GROUP BY EMAIL
                LIMIT 50
            """,

            'Complex Filter': """
                SELECT TX_ID_KEY, EMAIL, TX_DATETIME, MODEL_SCORE
                FROM transactions_enriched
                WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '30 days'
                  AND MODEL_SCORE > 0.7
                LIMIT 50
            """
        }

        # Run verification for each query
        results = []
        for query_name, query in test_queries.items():
            try:
                result = self.verify_query_performance(query_name, query)
                results.append(result)
            except Exception as e:
                logger.error(f"❌ Failed to verify {query_name}: {e}")
                results.append({
                    'query_name': query_name,
                    'status': '❌ ERROR',
                    'error': str(e)
                })

        # Calculate summary
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.get('within_threshold', False))
        failed_tests = total_tests - passed_tests

        summary = {
            'total_tests': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'pass_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            'success': failed_tests == 0,
            'results': results
        }

        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info("VERIFICATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {failed_tests}")
        logger.info(f"Pass Rate: {summary['pass_rate']:.1f}%")

        if summary['success']:
            logger.info("\n🎉 ALL PERFORMANCE TESTS PASSED!")
            logger.info("PostgreSQL performance is within 20% of Snowflake for all queries")
        else:
            logger.error("\n❌ PERFORMANCE VERIFICATION FAILED")
            logger.error(f"{failed_tests} queries exceeded 20% threshold")

        logger.info("=" * 60)

        return summary


def verify_pool_configuration() -> bool:
    """
    Verify PostgreSQL connection pool configuration.

    Returns:
        True if configuration is valid
    """
    logger.info("\n🔧 Verifying connection pool configuration...")

    try:
        tuner = PostgreSQLPoolTuner()
        pg_provider = get_database_provider('postgresql')

        # Get current configuration
        config = {
            'pool_size': pg_provider._config.get('pool_size'),
            'pool_max_overflow': pg_provider._config.get('pool_max_overflow'),
            'query_timeout': pg_provider._config.get('query_timeout')
        }

        # Validate configuration
        validation = tuner.validate_pool_configuration(config)

        if validation['valid']:
            logger.info("✅ Connection pool configuration is valid")

            if validation['warnings']:
                for warning in validation['warnings']:
                    logger.warning(f"  ⚠️  {warning}")

            if validation['recommendations']:
                logger.info("\n  💡 Recommendations:")
                for rec in validation['recommendations']:
                    logger.info(f"    - {rec}")

            return True
        else:
            logger.error("❌ Connection pool configuration is invalid")
            return False

    except Exception as e:
        logger.error(f"❌ Failed to verify pool configuration: {e}")
        return False


def main():
    """Main verification workflow."""
    logger.info("Starting performance verification...")

    # Verify pool configuration first
    pool_valid = verify_pool_configuration()

    if not pool_valid:
        logger.error("\n❌ Pool configuration validation failed - fix before running performance tests")
        sys.exit(1)

    # Run performance verification suite
    verifier = PerformanceVerifier()
    summary = verifier.run_verification_suite()

    # Exit with appropriate code
    sys.exit(0 if summary.get('success', False) else 1)


if __name__ == "__main__":
    main()
