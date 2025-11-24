#!/usr/bin/env python3
"""
Direct test of RiskAnalyzer with PostgreSQL.
Verifies that DATABASE_PROVIDER=postgresql is respected.
"""

import os
import sys
import asyncio

# Ensure we're using PostgreSQL
os.environ['DATABASE_PROVIDER'] = 'postgresql'
os.environ['USE_SNOWFLAKE'] = 'false'

async def test_risk_analyzer():
    """Test RiskAnalyzer initialization and database query."""
    print('='*80)
    print('PostgreSQL RiskAnalyzer Integration Test')
    print('='*80)
    print(f'\n📊 Environment Configuration:')
    print(f'   DATABASE_PROVIDER: {os.getenv("DATABASE_PROVIDER")}')
    print(f'   USE_SNOWFLAKE: {os.getenv("USE_SNOWFLAKE")}')

    try:
        # Import RiskAnalyzer
        from app.service.analytics.risk_analyzer import get_risk_analyzer
        from app.service.agent.tools.snowflake_tool.schema_constants import IP

        print(f'\n🔍 Initializing RiskAnalyzer...')
        analyzer = get_risk_analyzer()

        # Check what database provider was instantiated
        provider_type = type(analyzer.client).__name__
        print(f'✅ RiskAnalyzer initialized with: {provider_type}')

        if 'PostgreSQL' in provider_type:
            print(f'   ✅ CORRECT: Using PostgreSQL provider')
        elif 'Snowflake' in provider_type:
            print(f'   ❌ ERROR: Using Snowflake provider (should be PostgreSQL!)')
            return False
        else:
            print(f'   ⚠️  UNKNOWN: Using {provider_type}')

        # Test database query
        print(f'\n🔍 Testing database query for high-risk IPs...')

        # Enable verbose logging temporarily
        import logging
        logging.getLogger('app.service.analytics.risk_analyzer').setLevel(logging.DEBUG)
        logging.getLogger('app.service.agent.tools.database_tool.postgres_client').setLevel(logging.DEBUG)
        logging.getLogger('app.service.agent.tools.database_tool.query_translator').setLevel(logging.DEBUG)

        results = await analyzer.get_top_risk_entities(
            time_window='24h',
            group_by=IP,
            top_percentage=10,
            force_refresh=True
        )

        if results.get('status') == 'success':
            entities = results.get('entities', [])
            print(f'✅ Query successful: Found {len(entities)} high-risk IP addresses')

            if entities:
                print(f'\n📋 Top 5 High-Risk IPs:')
                for i, entity in enumerate(entities[:5], 1):
                    print(f'   {i}. IP: {entity.get("entity")}, Risk Score: {entity.get("risk_score"):.4f}')
            else:
                print(f'   ℹ️  No high-risk entities found (database may be empty)')

            return True
        else:
            print(f'❌ Query failed: {results.get("error", "Unknown error")}')
            return False

    except Exception as e:
        print(f'❌ Error during test: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print('\n' + '='*80)
    print('VERIFICATION: RiskAnalyzer respects DATABASE_PROVIDER setting')
    print('='*80 + '\n')

    success = asyncio.run(test_risk_analyzer())

    print('\n' + '='*80)
    if success:
        print('✅ TEST PASSED: RiskAnalyzer correctly using PostgreSQL')
    else:
        print('❌ TEST FAILED: RiskAnalyzer configuration issue')
    print('='*80 + '\n')

    sys.exit(0 if success else 1)
