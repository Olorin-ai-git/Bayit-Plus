#!/usr/bin/env python3
"""
Test the new analyzer pattern: APPROVED AND IS_FRAUD_TX=1
Should return ALL entities with fraud in the 24-hour window.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.analytics.risk_analyzer import RiskAnalyzer
from app.service.agent.tools.database_tool.database_factory import get_database_provider


async def main():
    """Test the new analyzer pattern"""
    print("=" * 80)
    print("🧪 TESTING NEW ANALYZER PATTERN")
    print("=" * 80)
    print()
    
    # Initialize database provider
    provider_class = get_database_provider()
    provider = provider_class()
    provider.connect()
    
    # Initialize analyzer
    analyzer = RiskAnalyzer(provider)
    
    # Calculate window dates
    hours = int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24'))
    max_lookback_months = int(os.getenv('ANALYZER_END_OFFSET_MONTHS', '6'))
    max_lookback_days = max_lookback_months * 30
    
    end_date = datetime.utcnow() - timedelta(days=max_lookback_days)
    start_date = end_date - timedelta(hours=hours)
    
    print(f"📅 Analyzer Window:")
    print(f"   Start: {start_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"   End:   {end_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"   Duration: {hours} hours")
    print()
    
    print(f"🎯 New Pattern: APPROVED=TRUE AND IS_FRAUD_TX=1")
    print(f"   Expected: ALL entities with fraud (no top 10% limit)")
    print()
    
    # Run analyzer
    print("🔄 Running analyzer...")
    print()
    
    result = await analyzer.analyze_risk(
        time_window=f"{hours}h",
        group_by="EMAIL",
        top_percentage=100.0,  # Not used anymore, but keep for backward compatibility
        force_refresh=True
    )
    
    # Display results
    print("=" * 80)
    print("📊 ANALYZER RESULTS")
    print("=" * 80)
    print()
    
    entities = result.get('entities', [])
    print(f"✅ Found {len(entities)} entities with APPROVED fraud")
    print()
    
    if entities:
        print("Top 10 entities (ordered by fraud_count, transaction_count):")
        print()
        for i, entity in enumerate(entities[:10], 1):
            print(f"{i}. {entity['entity']}")
            print(f"   Fraud Count: {entity.get('fraud_count', 0)}")
            print(f"   Transaction Count: {entity['transaction_count']}")
            print(f"   Avg Model Score: {entity.get('risk_score', 0):.3f}")
            print()
    else:
        print("⚠️ No fraud entities found in this window")
        print("   Try a different time window or check if fraud exists in the database")
    
    # Summary
    summary = result.get('summary', {})
    print("=" * 80)
    print("📈 SUMMARY")
    print("=" * 80)
    print(f"Total Entities: {summary.get('total_entities', 0)}")
    print(f"Total Transactions: {summary.get('total_transactions', 0)}")
    print(f"Total Fraud: {summary.get('total_fraud', 0)}")
    print(f"Avg Risk Score: {summary.get('average_risk_score', 0):.3f}")
    print()
    
    print("✅ Test complete!")


if __name__ == "__main__":
    asyncio.run(main())

