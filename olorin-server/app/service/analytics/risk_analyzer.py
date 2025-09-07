"""
Risk Analyzer for Snowflake-based fraud detection analytics.
Analyzes transaction data to identify high-risk entities.
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.client import SnowflakeClient

logger = get_bridge_logger(__name__)


class RiskAnalyzer:
    """Analyzes transaction risk using Snowflake data."""
    
    def __init__(self):
        """Initialize the risk analyzer."""
        self.client = SnowflakeClient()
        self._load_configuration()
        self._cache = {}
        self._cache_timestamp = None
        self._cache_ttl = 300  # 5 minutes cache
    
    def _load_configuration(self):
        """Load analytics configuration from environment."""
        # Default configuration from .env
        self.default_time_window = os.getenv('ANALYTICS_DEFAULT_TIME_WINDOW', '24h')
        self.default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email')
        self.default_top_percentage = float(os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10'))
        self.cache_ttl = int(os.getenv('ANALYTICS_CACHE_TTL', '300'))
        
        logger.info(f"Risk Analyzer configured: time_window={self.default_time_window}, "
                   f"group_by={self.default_group_by}, top={self.default_top_percentage}%")
    
    def _parse_time_window(self, time_window: str) -> int:
        """
        Parse time window string to hours.
        
        Args:
            time_window: Time window string (e.g., '24h', '7d', '30d')
            
        Returns:
            Number of hours
        """
        time_window = time_window.lower()
        
        if time_window.endswith('h'):
            return int(time_window[:-1])
        elif time_window.endswith('d'):
            return int(time_window[:-1]) * 24
        elif time_window.endswith('w'):
            return int(time_window[:-1]) * 24 * 7
        else:
            # Default to hours if no suffix
            return int(time_window)
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid."""
        if not self._cache_timestamp:
            return False
        
        age = (datetime.now() - self._cache_timestamp).total_seconds()
        return age < self._cache_ttl
    
    async def get_top_risk_entities(
        self,
        time_window: Optional[str] = None,
        group_by: Optional[str] = None,
        top_percentage: Optional[float] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get top risk entities based on risk-weighted transaction value.
        
        Args:
            time_window: Time window to analyze (e.g., '24h', '7d')
            group_by: Field to group by (e.g., 'email', 'device_id')
            top_percentage: Top percentage to return (e.g., 10 for top 10%)
            force_refresh: Force refresh bypassing cache
            
        Returns:
            Dictionary with analysis results
        """
        # Use defaults if not provided
        time_window = time_window or self.default_time_window
        group_by = group_by or self.default_group_by
        top_percentage = top_percentage or self.default_top_percentage
        
        # Check cache unless force refresh
        cache_key = f"{time_window}_{group_by}_{top_percentage}"
        if not force_refresh and self._is_cache_valid() and cache_key in self._cache:
            logger.info(f"Returning cached risk analysis for {cache_key}")
            return self._cache[cache_key]
        
        try:
            # Parse time window to hours
            hours = self._parse_time_window(time_window)
            
            # Connect to Snowflake
            await self.client.connect()
            
            # Build and execute query
            query = self._build_risk_query(hours, group_by, top_percentage)
            results = await self.client.execute_query(query)
            
            # Process results
            analysis = self._process_results(results, time_window, group_by, top_percentage)
            
            # Update cache
            self._cache[cache_key] = analysis
            self._cache_timestamp = datetime.now()
            
            logger.info(f"Risk analysis completed: {len(results)} entities identified")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Risk analysis failed: {e}")
            return {
                'error': str(e),
                'status': 'failed',
                'timestamp': datetime.now().isoformat()
            }
        finally:
            try:
                await self.client.disconnect()
            except:
                pass
    
    def _build_risk_query(self, hours: int, group_by: str, top_percentage: float) -> str:
        """
        Build SQL query for risk analysis.
        
        Args:
            hours: Number of hours to look back
            group_by: Field to group by
            top_percentage: Top percentage to return
            
        Returns:
            SQL query string
        """
        # Convert percentage to decimal
        top_decimal = top_percentage / 100.0
        
        query = f"""
        WITH risk_calculations AS (
            SELECT 
                {group_by} as entity,
                COUNT(*) as transaction_count,
                SUM(PAID_AMOUNT_VALUE) as total_amount,
                AVG(MODEL_SCORE) as avg_risk_score,
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value,
                MAX(MODEL_SCORE) as max_risk_score,
                MIN(MODEL_SCORE) as min_risk_score,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN NSURE_LAST_DECISION = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
                MAX(TX_DATETIME) as last_transaction,
                MIN(TX_DATETIME) as first_transaction
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            WHERE TX_DATETIME >= DATEADD(hour, -{hours}, CURRENT_TIMESTAMP())
                AND {group_by} IS NOT NULL
            GROUP BY {group_by}
            HAVING COUNT(*) >= 1
        ),
        ranked AS (
            SELECT *,
                ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
                COUNT(*) OVER() as total_entities,
                PERCENT_RANK() OVER (ORDER BY risk_weighted_value DESC) as percentile
            FROM risk_calculations
        )
        SELECT * FROM ranked
        WHERE risk_rank <= CEIL(total_entities * {top_decimal})
        ORDER BY risk_weighted_value DESC
        """
        
        return query
    
    def _process_results(
        self, 
        results: List[Dict[str, Any]], 
        time_window: str,
        group_by: str,
        top_percentage: float
    ) -> Dict[str, Any]:
        """
        Process query results into structured analysis.
        
        Args:
            results: Raw query results
            time_window: Time window used
            group_by: Grouping field used
            top_percentage: Top percentage used
            
        Returns:
            Processed analysis dictionary
        """
        if not results:
            return {
                'status': 'success',
                'message': 'No entities found in specified time window',
                'entities': [],
                'summary': {
                    'total_entities': 0,
                    'time_window': time_window,
                    'group_by': group_by,
                    'top_percentage': top_percentage
                },
                'timestamp': datetime.now().isoformat()
            }
        
        # Calculate summary statistics (handle uppercase from Snowflake)
        total_risk_value = sum((r.get('RISK_WEIGHTED_VALUE') or r.get('risk_weighted_value') or 0) for r in results)
        total_transactions = sum((r.get('TRANSACTION_COUNT') or r.get('transaction_count') or 0) for r in results)
        total_amount = sum((r.get('TOTAL_AMOUNT') or r.get('total_amount') or 0) for r in results)
        total_fraud = sum((r.get('FRAUD_COUNT') or r.get('fraud_count') or 0) for r in results)
        
        # Format entities for response (Snowflake returns uppercase column names)
        entities = []
        for r in results:
            entities.append({
                'entity': r.get('ENTITY') or r.get('entity'),
                'risk_rank': r.get('RISK_RANK') or r.get('risk_rank'),
                'risk_score': round((r.get('AVG_RISK_SCORE') or r.get('avg_risk_score') or 0), 3),
                'risk_weighted_value': round((r.get('RISK_WEIGHTED_VALUE') or r.get('risk_weighted_value') or 0), 2),
                'transaction_count': r.get('TRANSACTION_COUNT') or r.get('transaction_count'),
                'total_amount': round((r.get('TOTAL_AMOUNT') or r.get('total_amount') or 0), 2),
                'fraud_count': (r.get('FRAUD_COUNT') or r.get('fraud_count') or 0),
                'rejected_count': (r.get('REJECTED_COUNT') or r.get('rejected_count') or 0),
                'max_risk_score': round((r.get('MAX_RISK_SCORE') or r.get('max_risk_score') or 0), 3),
                'percentile': round((r.get('PERCENTILE') or r.get('percentile') or 0) * 100, 1),
                'last_transaction': r.get('LAST_TRANSACTION') or r.get('last_transaction'),
                'first_transaction': r.get('FIRST_TRANSACTION') or r.get('first_transaction')
            })
        
        return {
            'status': 'success',
            'entities': entities,
            'summary': {
                'total_entities': len(entities),
                'total_risk_value': round(total_risk_value, 2),
                'total_transactions': total_transactions,
                'total_amount': round(total_amount, 2),
                'total_fraud': total_fraud,
                'fraud_rate': round(total_fraud / total_transactions * 100, 2) if total_transactions > 0 else 0,
                'time_window': time_window,
                'group_by': group_by,
                'top_percentage': top_percentage
            },
            'timestamp': datetime.now().isoformat()
        }
    
    async def analyze_entity(
        self,
        entity_value: str,
        entity_type: str = 'email',
        time_window: str = '30d'
    ) -> Dict[str, Any]:
        """
        Analyze a specific entity's risk profile.
        
        Args:
            entity_value: The entity value to analyze
            entity_type: Type of entity (email, device_id, etc.)
            time_window: Time window for analysis
            
        Returns:
            Detailed entity analysis
        """
        try:
            hours = self._parse_time_window(time_window)
            
            await self.client.connect()
            
            query = f"""
            SELECT 
                COUNT(*) as transaction_count,
                SUM(PAID_AMOUNT_VALUE) as total_amount,
                AVG(MODEL_SCORE) as avg_risk_score,
                MAX(MODEL_SCORE) as max_risk_score,
                MIN(MODEL_SCORE) as min_risk_score,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN NSURE_LAST_DECISION = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
                COUNT(DISTINCT MERCHANT_NAME) as unique_merchants,
                COUNT(DISTINCT CARD_LAST4) as unique_cards,
                COUNT(DISTINCT IP_ADDRESS) as unique_ips,
                COUNT(DISTINCT DEVICE_ID) as unique_devices,
                MAX(TX_DATETIME) as last_transaction,
                MIN(TX_DATETIME) as first_transaction
            FROM FRAUD_ANALYTICS.PUBLIC.TRANSACTIONS_ENRICHED
            WHERE {entity_type} = '{entity_value}'
                AND TX_DATETIME >= DATEADD(hour, -{hours}, CURRENT_TIMESTAMP())
            """
            
            results = await self.client.execute_query(query)
            
            if not results or results[0].get('transaction_count', 0) == 0:
                return {
                    'status': 'success',
                    'message': f'No transactions found for {entity_type}: {entity_value}',
                    'entity': entity_value,
                    'entity_type': entity_type,
                    'timestamp': datetime.now().isoformat()
                }
            
            r = results[0]
            return {
                'status': 'success',
                'entity': entity_value,
                'entity_type': entity_type,
                'profile': {
                    'transaction_count': r.get('transaction_count'),
                    'total_amount': round(r.get('total_amount', 0), 2),
                    'avg_risk_score': round(r.get('avg_risk_score', 0), 3),
                    'max_risk_score': round(r.get('max_risk_score', 0), 3),
                    'min_risk_score': round(r.get('min_risk_score', 0), 3),
                    'fraud_count': r.get('fraud_count', 0),
                    'rejected_count': r.get('rejected_count', 0),
                    'unique_merchants': r.get('unique_merchants'),
                    'unique_cards': r.get('unique_cards'),
                    'unique_ips': r.get('unique_ips'),
                    'unique_devices': r.get('unique_devices'),
                    'first_transaction': r.get('first_transaction'),
                    'last_transaction': r.get('last_transaction')
                },
                'risk_assessment': self._assess_risk(r),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Entity analysis failed: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'entity': entity_value,
                'entity_type': entity_type,
                'timestamp': datetime.now().isoformat()
            }
        finally:
            try:
                await self.client.disconnect()
            except:
                pass
    
    def _assess_risk(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess risk level based on entity profile.
        
        Args:
            profile: Entity profile data
            
        Returns:
            Risk assessment dictionary
        """
        avg_risk = profile.get('avg_risk_score', 0)
        fraud_count = profile.get('fraud_count', 0)
        transaction_count = profile.get('transaction_count', 1)
        
        # Determine risk level
        if avg_risk > 0.7 or fraud_count > 0:
            risk_level = 'HIGH'
        elif avg_risk > 0.4:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # Calculate fraud rate
        fraud_rate = (fraud_count / transaction_count * 100) if transaction_count > 0 else 0
        
        return {
            'risk_level': risk_level,
            'risk_score': round(avg_risk, 3),
            'fraud_rate': round(fraud_rate, 2),
            'indicators': {
                'high_risk_score': avg_risk > 0.7,
                'confirmed_fraud': fraud_count > 0,
                'multiple_devices': profile.get('unique_devices', 0) > 3,
                'multiple_cards': profile.get('unique_cards', 0) > 5,
                'suspicious_velocity': transaction_count > 50
            }
        }


# Global instance
_risk_analyzer = None


def get_risk_analyzer() -> RiskAnalyzer:
    """Get the global risk analyzer instance."""
    global _risk_analyzer
    if _risk_analyzer is None:
        _risk_analyzer = RiskAnalyzer()
    return _risk_analyzer