#!/usr/bin/env python3
"""
Investigate Top Risk Entities from Snowflake
Bridges Snowflake risk analysis with autonomous investigations.

This script:
1. Fetches top 10% risk entities from Snowflake
2. Seeds autonomous investigations with these entities
3. Compares findings against historical data
4. Generates comprehensive investigation reports

Author: Gil Klainert
Created: 2025-09-07
"""

import asyncio
import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import subprocess
import time

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.client import SnowflakeClient

logger = get_bridge_logger(__name__)


class RiskEntityInvestigator:
    """Investigates top risk entities using autonomous investigation system."""
    
    def __init__(self):
        """Initialize the investigator."""
        self.risk_analyzer = get_risk_analyzer()
        self.snowflake_client = SnowflakeClient()
        self.investigation_results = []
        
    async def get_top_risk_entities(
        self,
        time_window: str = "24h",
        group_by: str = "email",
        top_percentage: float = 10,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch top risk entities from Snowflake.
        
        Args:
            time_window: Time window to analyze
            group_by: Field to group by (EMAIL, DEVICE_ID, IP)
            top_percentage: Top percentage to return
            force_refresh: Force refresh bypassing cache
            
        Returns:
            List of top risk entities
        """
        print(f"\n📊 Fetching top {top_percentage}% risk entities grouped by {group_by}...")
        
        results = await self.risk_analyzer.get_top_risk_entities(
            time_window=time_window,
            group_by=group_by,
            top_percentage=top_percentage,
            force_refresh=force_refresh
        )
        
        if results['status'] == 'success':
            entities = results['entities']
            print(f"✅ Found {len(entities)} high-risk entities")
            return entities
        else:
            print(f"❌ Failed to fetch entities: {results.get('error', 'Unknown error')}")
            return []
    
    async def get_entity_historical_data(
        self,
        entity_value: str,
        entity_type: str,
        lookback_days: int = 90
    ) -> Dict[str, Any]:
        """
        Fetch historical data for an entity from Snowflake.

        Args:
            entity_value: The entity value (email, device_id, or ip_address)
            entity_type: Type of entity
            lookback_days: Days to look back for historical data

        Returns:
            Historical data and patterns
        """
        # Get table configuration from environment
        database = os.getenv('SNOWFLAKE_DATABASE', 'FRAUD_ANALYTICS')
        schema = os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
        table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')

        try:
            await self.snowflake_client.connect()
            
            # Build historical analysis query
            query = f"""
            WITH historical_stats AS (
                SELECT 
                    DATE_TRUNC('day', TX_DATETIME) as tx_date,
                    COUNT(*) as daily_transactions,
                    AVG(MODEL_SCORE) as avg_daily_risk,
                    SUM(PAID_AMOUNT_VALUE) as daily_amount,
                    MAX(MODEL_SCORE) as max_daily_risk,
                    COUNT(DISTINCT MERCHANT_NAME) as unique_merchants,
                    COUNT(DISTINCT CARD_LAST4) as unique_cards,
                    COUNT(DISTINCT IP_ADDRESS) as unique_ips,
                    COUNT(DISTINCT DEVICE_ID) as unique_devices,
                    SUM(CASE WHEN IS_FRAUD_TX = TRUE THEN 1 ELSE 0 END) as fraud_count
                FROM {database}.{schema}.{table}
                WHERE {entity_type} = '{entity_value}'
                    AND TX_DATETIME >= DATEADD(day, -{lookback_days}, CURRENT_TIMESTAMP())
                GROUP BY tx_date
                ORDER BY tx_date DESC
            ),
            pattern_analysis AS (
                SELECT
                    AVG(daily_transactions) as avg_daily_txns,
                    STDDEV(daily_transactions) as stddev_daily_txns,
                    AVG(avg_daily_risk) as overall_avg_risk,
                    MAX(daily_transactions) as max_daily_txns,
                    MIN(daily_transactions) as min_daily_txns,
                    AVG(daily_amount) as avg_daily_amount,
                    COUNT(DISTINCT tx_date) as active_days,
                    SUM(fraud_count) as total_fraud_count
                FROM historical_stats
            ),
            recent_activity AS (
                SELECT
                    COUNT(*) as recent_24h_txns,
                    AVG(MODEL_SCORE) as recent_24h_risk,
                    SUM(PAID_AMOUNT_VALUE) as recent_24h_amount
                FROM {database}.{schema}.{table}
                WHERE {entity_type} = '{entity_value}'
                    AND TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
            )
            SELECT 
                p.*,
                r.recent_24h_txns,
                r.recent_24h_risk,
                r.recent_24h_amount,
                -- Calculate anomaly scores
                CASE 
                    WHEN p.stddev_daily_txns > 0 THEN 
                        ABS(r.recent_24h_txns - p.avg_daily_txns) / p.stddev_daily_txns
                    ELSE 0
                END as volume_anomaly_score,
                CASE
                    WHEN p.overall_avg_risk > 0 THEN
                        r.recent_24h_risk / p.overall_avg_risk
                    ELSE 0
                END as risk_anomaly_score
            FROM pattern_analysis p
            CROSS JOIN recent_activity r
            """
            
            results = await self.snowflake_client.execute_query(query)
            
            if results:
                data = results[0]
                return {
                    'entity': entity_value,
                    'entity_type': entity_type,
                    'historical_patterns': {
                        'avg_daily_transactions': float(data.get('AVG_DAILY_TXNS', 0)),
                        'stddev_daily_transactions': float(data.get('STDDEV_DAILY_TXNS', 0)),
                        'overall_avg_risk': float(data.get('OVERALL_AVG_RISK', 0)),
                        'max_daily_transactions': int(data.get('MAX_DAILY_TXNS', 0)),
                        'min_daily_transactions': int(data.get('MIN_DAILY_TXNS', 0)),
                        'avg_daily_amount': float(data.get('AVG_DAILY_AMOUNT', 0)),
                        'active_days': int(data.get('ACTIVE_DAYS', 0)),
                        'total_fraud_count': int(data.get('TOTAL_FRAUD_COUNT', 0))
                    },
                    'recent_activity': {
                        'transactions_24h': int(data.get('RECENT_24H_TXNS', 0)),
                        'risk_score_24h': float(data.get('RECENT_24H_RISK', 0)),
                        'amount_24h': float(data.get('RECENT_24H_AMOUNT', 0))
                    },
                    'anomaly_scores': {
                        'volume_anomaly': float(data.get('VOLUME_ANOMALY_SCORE', 0)),
                        'risk_anomaly': float(data.get('RISK_ANOMALY_SCORE', 0))
                    }
                }
            
            return {}
            
        finally:
            await self.snowflake_client.disconnect()
    
    def trigger_autonomous_investigation(
        self,
        entity_value: str,
        entity_type: str,
        historical_data: Dict[str, Any],
        mode: str = "demo"
    ) -> Dict[str, Any]:
        """
        Trigger autonomous investigation for an entity.
        
        Args:
            entity_value: The entity to investigate
            entity_type: Type of entity (email, device_id, ip_address)
            historical_data: Historical patterns for context
            mode: Investigation mode (demo, mock, live)
            
        Returns:
            Investigation results
        """
        print(f"\n🔍 Triggering autonomous investigation for {entity_type}: {entity_value}")
        
        # Prepare investigation context
        context = {
            'entity_value': entity_value,
            'entity_type': entity_type,
            'historical_patterns': historical_data.get('historical_patterns', {}),
            'recent_activity': historical_data.get('recent_activity', {}),
            'anomaly_scores': historical_data.get('anomaly_scores', {})
        }
        
        # Determine appropriate fraud scenario based on anomalies
        scenario = self._determine_scenario(historical_data)
        
        # Build command for autonomous investigation
        script_path = Path(__file__).parent / "testing" / "unified_autonomous_test_runner.py"
        
        cmd = [
            "poetry", "run", "python", str(script_path),
            "--scenario", scenario,
            "--mode", mode,
            "--entity-seed", entity_value,
            "--entity-type", entity_type,
            "--verbose",
            "--show-websocket",
            "--show-llm"
        ]
        
        # Add historical context as JSON
        cmd.extend(["--historical-context", json.dumps(context)])
        
        print(f"   Scenario: {scenario}")
        print(f"   Volume Anomaly Score: {historical_data['anomaly_scores']['volume_anomaly']:.2f}")
        print(f"   Risk Anomaly Score: {historical_data['anomaly_scores']['risk_anomaly']:.2f}")
        
        # Execute investigation
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                print(f"✅ Investigation completed successfully")
                return {
                    'status': 'success',
                    'entity': entity_value,
                    'scenario': scenario,
                    'output': result.stdout
                }
            else:
                print(f"❌ Investigation failed: {result.stderr}")
                return {
                    'status': 'failed',
                    'entity': entity_value,
                    'scenario': scenario,
                    'error': result.stderr
                }
                
        except subprocess.TimeoutExpired:
            print(f"⚠️ Investigation timed out")
            return {
                'status': 'timeout',
                'entity': entity_value,
                'scenario': scenario
            }
        except Exception as e:
            print(f"❌ Investigation error: {e}")
            return {
                'status': 'error',
                'entity': entity_value,
                'error': str(e)
            }
    
    def _determine_scenario(self, historical_data: Dict[str, Any]) -> str:
        """
        Determine the appropriate fraud scenario based on anomaly patterns.
        
        Args:
            historical_data: Historical patterns and anomaly scores
            
        Returns:
            Fraud scenario name
        """
        anomalies = historical_data.get('anomaly_scores', {})
        patterns = historical_data.get('historical_patterns', {})
        recent = historical_data.get('recent_activity', {})
        
        volume_anomaly = anomalies.get('volume_anomaly', 0)
        risk_anomaly = anomalies.get('risk_anomaly', 0)
        
        # High volume spike suggests velocity fraud
        if volume_anomaly > 3:
            return "velocity_abuse"
        
        # High risk spike with normal volume suggests account takeover
        if risk_anomaly > 2 and volume_anomaly < 2:
            return "account_takeover"
        
        # New entity with high risk suggests synthetic identity
        if patterns.get('active_days', 0) < 7 and recent.get('risk_score_24h', 0) > 0.7:
            return "synthetic_identity"
        
        # Multiple devices/IPs suggests device spoofing
        if patterns.get('unique_devices', 0) > 5:
            return "device_spoofing"
        
        # Geographic anomalies (would need location data)
        if patterns.get('unique_ips', 0) > 10:
            return "location_impossible_travel"
        
        # Complex patterns suggest advanced fraud
        if risk_anomaly > 1.5 and volume_anomaly > 1.5:
            return "advanced_persistent_fraud"
        
        # Default to general device spoofing
        return "device_spoofing"
    
    async def investigate_all_top_entities(
        self,
        time_window: str = "24h",
        group_by: str = "email",
        top_percentage: float = 10,
        max_investigations: int = 5,
        mode: str = "demo"
    ):
        """
        Investigate all top risk entities.
        
        Args:
            time_window: Time window for risk analysis
            group_by: Field to group by
            top_percentage: Top percentage to investigate
            max_investigations: Maximum number of investigations to run
            mode: Investigation mode
        """
        print("\n" + "="*80)
        print("🕵️ SNOWFLAKE-DRIVEN AUTONOMOUS INVESTIGATION")
        print("="*80)
        
        # Get top risk entities
        entities = await self.get_top_risk_entities(
            time_window=time_window,
            group_by=group_by,
            top_percentage=top_percentage,
            force_refresh=True
        )
        
        if not entities:
            print("❌ No entities to investigate")
            return
        
        # Limit investigations
        entities_to_investigate = entities[:max_investigations]
        
        print(f"\n📋 Will investigate top {len(entities_to_investigate)} entities:")
        for i, entity in enumerate(entities_to_investigate, 1):
            print(f"   {i}. {entity['entity']} (Risk Value: ${entity['risk_weighted_value']:,.2f})")
        
        # Investigate each entity
        for i, entity in enumerate(entities_to_investigate, 1):
            print(f"\n{'='*80}")
            print(f"Investigation {i}/{len(entities_to_investigate)}: {entity['entity']}")
            print("="*80)
            
            # Get historical data
            historical_data = await self.get_entity_historical_data(
                entity_value=entity['entity'],
                entity_type=group_by,
                lookback_days=90
            )
            
            if historical_data:
                # Display historical context
                print("\n📈 Historical Context:")
                patterns = historical_data['historical_patterns']
                print(f"   Average Daily Transactions: {patterns['avg_daily_transactions']:.1f}")
                print(f"   Historical Risk Score: {patterns['overall_avg_risk']:.3f}")
                print(f"   Active Days: {patterns['active_days']}")
                print(f"   Total Fraud Count: {patterns['total_fraud_count']}")
                
                print("\n🔥 Recent Activity (24h):")
                recent = historical_data['recent_activity']
                print(f"   Transactions: {recent['transactions_24h']}")
                print(f"   Risk Score: {recent['risk_score_24h']:.3f}")
                print(f"   Total Amount: ${recent['amount_24h']:,.2f}")
                
                # Trigger investigation
                result = self.trigger_autonomous_investigation(
                    entity_value=entity['entity'],
                    entity_type=group_by,
                    historical_data=historical_data,
                    mode=mode
                )
                
                self.investigation_results.append(result)
            else:
                print(f"⚠️ No historical data found for {entity['entity']}")
            
            # Small delay between investigations
            if i < len(entities_to_investigate):
                time.sleep(2)
        
        # Generate summary report
        self._generate_summary_report()
    
    def _generate_summary_report(self):
        """Generate summary report of all investigations."""
        print("\n" + "="*80)
        print("📊 INVESTIGATION SUMMARY REPORT")
        print("="*80)
        
        successful = sum(1 for r in self.investigation_results if r['status'] == 'success')
        failed = sum(1 for r in self.investigation_results if r['status'] == 'failed')
        timeout = sum(1 for r in self.investigation_results if r['status'] == 'timeout')
        
        print(f"\nTotal Investigations: {len(self.investigation_results)}")
        print(f"   ✅ Successful: {successful}")
        print(f"   ❌ Failed: {failed}")
        print(f"   ⏱️ Timeout: {timeout}")
        
        print("\nDetailed Results:")
        for result in self.investigation_results:
            status_icon = "✅" if result['status'] == 'success' else "❌"
            print(f"{status_icon} {result['entity']}: {result.get('scenario', 'N/A')} - {result['status']}")
        
        # Save report to file
        report_file = f"investigation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'summary': {
                    'total': len(self.investigation_results),
                    'successful': successful,
                    'failed': failed,
                    'timeout': timeout
                },
                'investigations': self.investigation_results
            }, f, indent=2)
        
        print(f"\n📁 Report saved to: {report_file}")


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description='Investigate top risk entities from Snowflake'
    )
    
    parser.add_argument(
        '--time-window',
        default='24h',
        help='Time window to analyze (1h, 6h, 12h, 24h, 7d, 30d)'
    )
    
    parser.add_argument(
        '--group-by',
        default='email',
        choices=['email', 'device_id', 'ip_address'],
        help='Field to group by'
    )
    
    parser.add_argument(
        '--top',
        type=float,
        default=10,
        help='Top percentage to investigate (1-100)'
    )
    
    parser.add_argument(
        '--max-investigations',
        type=int,
        default=5,
        help='Maximum number of entities to investigate'
    )
    
    parser.add_argument(
        '--mode',
        default='demo',
        choices=['mock', 'demo', 'live'],
        help='Investigation mode'
    )
    
    args = parser.parse_args()
    
    # Create investigator
    investigator = RiskEntityInvestigator()
    
    # Run investigations
    await investigator.investigate_all_top_entities(
        time_window=args.time_window,
        group_by=args.group_by,
        top_percentage=args.top,
        max_investigations=args.max_investigations,
        mode=args.mode
    )


if __name__ == "__main__":
    asyncio.run(main())