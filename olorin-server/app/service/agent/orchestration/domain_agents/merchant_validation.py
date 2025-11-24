"""
Merchant Agent Validation Service

Runs validation framework automatically for every investigation.
Compares merchant agent predictions with actual outcomes from historical data.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
import json

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient

logger = get_bridge_logger(__name__)


class MerchantValidationService:
    """Service for running merchant agent validation during investigations."""
    
    def __init__(self):
        """Initialize validation service."""
        self.snowflake_client = None
        self._postgres_engine: Optional[Engine] = None
        
    def _get_postgres_engine(self) -> Optional[Engine]:
        """Get or create Postgres engine for analytics queries."""
        if self._postgres_engine is None:
            # Get Postgres connection string from environment
            # Support both POSTGRES_DATABASE (preferred) and POSTGRES_DB (legacy)
            postgres_host = os.getenv('POSTGRES_HOST', 'localhost')
            postgres_port = os.getenv('POSTGRES_PORT', '5432')
            postgres_db = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB', 'olorin_db')
            postgres_user = os.getenv('POSTGRES_USER', 'gklainert')
            postgres_password = os.getenv('POSTGRES_PASSWORD', '')
            
            if not postgres_password:
                logger.warning("⚠️ Postgres password not configured, merchant risk level enrichment will be skipped")
                return None
            
            # Add gssencmode=disable to avoid GSSAPI errors on local connections
            connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}?gssencmode=disable"
            try:
                self._postgres_engine = create_engine(connection_string)
                logger.info("✅ Postgres engine initialized for merchant risk level queries")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Postgres engine: {e}")
                return None
        
        return self._postgres_engine
        
    async def initialize(self):
        """Initialize Snowflake client."""
        if not self.snowflake_client:
            self.snowflake_client = RealSnowflakeClient()
            await self.snowflake_client.connect()
            logger.info("✅ Merchant validation service initialized")
    
    async def cleanup(self):
        """Cleanup resources."""
        if self.snowflake_client:
            await self.snowflake_client.disconnect()
            self.snowflake_client = None
        if self._postgres_engine:
            self._postgres_engine.dispose()
            self._postgres_engine = None
    
    async def run_validation(
        self,
        investigation_id: str,
        entity_type: str,
        entity_id: str,
        merchant_findings: Dict[str, Any],
        investigation_folder: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Run merchant validation for an investigation.
        
        Args:
            investigation_id: Investigation ID
            entity_type: Type of entity
            entity_id: Entity identifier
            merchant_findings: Merchant agent findings
            investigation_folder: Optional investigation folder path to save results
            
        Returns:
            Validation results dictionary
        """
        try:
            await self.initialize()
            
            # Calculate historical date (6 months ago)
            historical_date = datetime.now() - timedelta(days=180)
            
            logger.info(f"🔍 Running merchant validation for investigation {investigation_id}")
            logger.info(f"   Entity: {entity_type}={entity_id}")
            logger.info(f"   Historical date: {historical_date.date()}")
            
            # Fetch historical data (24h window from 6 months ago)
            historical_data = await self._fetch_historical_data(
                entity_type, entity_id, historical_date
            )
            
            if historical_data["row_count"] == 0:
                logger.warning(f"⚠️ No historical data found for validation")
                return {
                    "validation_complete": False,
                    "error": "no_historical_data",
                    "historical_date": historical_date.isoformat()
                }
            
            # Fetch actual outcomes (from historical_date + 1 day to today)
            actual_outcomes = await self._fetch_actual_outcomes(
                entity_type, entity_id, historical_date
            )
            
            # Compare predictions with actual outcomes
            predicted_risk = merchant_findings.get("risk_score", 0.0)
            predicted_confidence = merchant_findings.get("confidence", 0.0)
            
            validation_results = self._validate_predictions(
                predicted_risk,
                predicted_confidence,
                actual_outcomes,
                merchant_findings
            )
            
            # Add metadata
            validation_results.update({
                "investigation_id": investigation_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "historical_date": historical_date.isoformat(),
                "validation_timestamp": datetime.now().isoformat(),
                "historical_transactions": historical_data["row_count"]
            })
            
            # Save validation results to investigation folder
            if investigation_folder:
                await self._save_validation_results(validation_results, investigation_folder)
            
            logger.info(f"✅ Merchant validation completed")
            logger.info(f"   Prediction accuracy: {validation_results.get('prediction_correct', False)}")
            logger.info(f"   Risk correlation error: {validation_results.get('risk_correlation_error', 'N/A')}")
            
            return validation_results
            
        except Exception as e:
            logger.error(f"❌ Merchant validation failed: {e}", exc_info=True)
            return {
                "validation_complete": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _fetch_historical_data(
        self,
        entity_type: str,
        entity_id: str,
        historical_date: datetime
    ) -> Dict[str, Any]:
        """Fetch historical transaction data for validation."""
        window_start = historical_date
        window_end = historical_date + timedelta(hours=24)
        
        entity_filters = {
            "user_id": f"EMAIL = '{entity_id}' OR USER_ID = '{entity_id}'",
            "email": f"EMAIL = '{entity_id}'",
            "ip": f"IP = '{entity_id}'",
            "device_id": f"DEVICE_ID = '{entity_id}'"
        }
        
        entity_filter = entity_filters.get(entity_type.lower(), f"EMAIL = '{entity_id}'")
        
        # CRITICAL: Exclude MODEL_SCORE and IS_FRAUD_TX from investigation queries
        # These columns must NOT appear in SELECT clauses during investigation
        query = f"""
        SELECT 
            TX_ID_KEY,
            TX_DATETIME,
            MERCHANT_NAME,
            PAID_AMOUNT_VALUE_IN_CURRENCY
        FROM DBT.DBT_PROD.TXS
        WHERE {entity_filter}
          AND TX_DATETIME >= '{window_start.isoformat()}'
          AND TX_DATETIME < '{window_end.isoformat()}'
        ORDER BY TX_DATETIME ASC
        """
        
        try:
            results = await self.snowflake_client.execute_query(query)
            
            # Enrich with merchant risk level from Postgres
            results = await self._enrich_with_merchant_risk_levels(results)
            
            return {
                "results": results,
                "row_count": len(results),
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to fetch historical data: {e}")
            return {"results": [], "row_count": 0}
    
    async def _fetch_actual_outcomes(
        self,
        entity_type: str,
        entity_id: str,
        historical_date: datetime
    ) -> Dict[str, Any]:
        """Fetch actual fraud outcomes after historical period."""
        outcome_start = historical_date + timedelta(days=1)
        outcome_end = datetime.now()
        
        entity_filters = {
            "user_id": f"EMAIL = '{entity_id}' OR USER_ID = '{entity_id}'",
            "email": f"EMAIL = '{entity_id}'",
            "ip": f"IP = '{entity_id}'",
            "device_id": f"DEVICE_ID = '{entity_id}'"
        }
        
        entity_filter = entity_filters.get(entity_type.lower(), f"EMAIL = '{entity_id}'")
        
        query = f"""
        SELECT 
            TX_ID_KEY,
            TX_DATETIME,
            MERCHANT_NAME,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            NSURE_LAST_DECISION
        FROM DBT.DBT_PROD.TXS
        WHERE {entity_filter}
          AND TX_DATETIME >= '{outcome_start.isoformat()}'
          AND TX_DATETIME <= '{outcome_end.isoformat()}'
        ORDER BY TX_DATETIME ASC
        """
        # CRITICAL: All fraud indicator columns (IS_FRAUD_TX, MODEL_SCORE, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) excluded to prevent data leakage
        
        try:
            results = await self.snowflake_client.execute_query(query)
            
            total_transactions = len(results)
            # CRITICAL: Use behavioral indicators only (rejected transactions)
            fraud_transactions = sum(1 for r in results 
                                   if r.get("NSURE_LAST_DECISION") in ("BLOCK", "REJECT", "DECLINE"))
            blocked_transactions = sum(1 for r in results if r.get("NSURE_LAST_DECISION") == "BLOCK" or r.get("NSURE_LAST_DECISION") == "REJECT")
            
            return {
                "results": results,
                "row_count": total_transactions,
                "fraud_count": fraud_transactions,
                "blocked_count": blocked_transactions,
                "fraud_rate": fraud_transactions / total_transactions if total_transactions > 0 else 0.0,
                "outcome_start": outcome_start.isoformat(),
                "outcome_end": outcome_end.isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to fetch actual outcomes: {e}")
            return {
                "results": [],
                "row_count": 0,
                "fraud_count": 0,
                "blocked_count": 0,
                "fraud_rate": 0.0
            }
    
    def _validate_predictions(
        self,
        predicted_risk: float,
        predicted_confidence: float,
        actual_outcomes: Dict[str, Any],
        merchant_findings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare predictions with actual outcomes."""
        actual_fraud_rate = actual_outcomes.get("fraud_rate", 0.0)
        actual_fraud_count = actual_outcomes.get("fraud_count", 0)
        actual_total = actual_outcomes.get("row_count", 0)
        
        # Calculate validation metrics
        predicted_high_risk = predicted_risk > 0.6 if predicted_risk is not None else False
        actual_high_fraud = actual_fraud_rate > 0.2
        
        prediction_correct = predicted_high_risk == actual_high_fraud
        
        # Calculate risk correlation error
        risk_correlation_error = abs(predicted_risk - actual_fraud_rate) if predicted_risk is not None else None
        
        # Extract merchant-specific findings for context
        merchant_risk_indicators = merchant_findings.get("risk_indicators", [])
        merchant_evidence = merchant_findings.get("evidence", [])
        
        return {
            "validation_complete": True,
            "predicted_risk_score": predicted_risk,
            "predicted_confidence": predicted_confidence,
            "predicted_high_risk": predicted_high_risk,
            "actual_fraud_rate": actual_fraud_rate,
            "actual_fraud_count": actual_fraud_count,
            "actual_total_transactions": actual_total,
            "actual_high_fraud": actual_high_fraud,
            "prediction_correct": prediction_correct,
            "risk_correlation_error": risk_correlation_error,
            "merchant_risk_indicators_count": len(merchant_risk_indicators),
            "merchant_evidence_count": len(merchant_evidence),
            "validation_quality": self._assess_validation_quality(
                risk_correlation_error,
                prediction_correct,
                actual_total
            )
        }
    
    def _assess_validation_quality(
        self,
        risk_correlation_error: Optional[float],
        prediction_correct: bool,
        actual_total: int
    ) -> str:
        """Assess validation quality based on metrics."""
        if actual_total == 0:
            return "insufficient_data"
        
        if risk_correlation_error is None:
            return "no_prediction"
        
        if risk_correlation_error < 0.1:
            return "excellent"
        elif risk_correlation_error < 0.3:
            return "good"
        elif risk_correlation_error < 0.5:
            return "fair"
        else:
            return "poor"
    
    async def _enrich_with_merchant_risk_levels(
        self,
        snowflake_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enrich Snowflake transaction results with merchant risk levels from Postgres.
        
        Merchant risk level is stored in Postgres analytics tables (transactions_enriched),
        not in Snowflake. This method fetches risk levels from Postgres and adds them
        to the Snowflake results.
        """
        if not snowflake_results:
            return snowflake_results
        
        postgres_engine = self._get_postgres_engine()
        if not postgres_engine:
            logger.warning("⚠️ Postgres engine not available, merchant risk levels will be set to 'UNKNOWN'")
            # Add UNKNOWN risk level to all results
            for result in snowflake_results:
                result["MERCHANT_RISK_LEVEL"] = "UNKNOWN"
            return snowflake_results
        
        # Extract unique merchant names from Snowflake results
        merchant_names = set()
        for result in snowflake_results:
            merchant_name = result.get("MERCHANT_NAME") or result.get("merchant_name")
            if merchant_name:
                merchant_names.add(merchant_name)
        
        if not merchant_names:
            logger.warning("⚠️ No merchant names found in Snowflake results")
            for result in snowflake_results:
                result["MERCHANT_RISK_LEVEL"] = "UNKNOWN"
            return snowflake_results
        
        # Build query to fetch merchant risk levels from Postgres
        # Get the most recent risk level for each merchant
        # NOTE: merchant_risk_level column may not exist in all Postgres schemas
        # If it doesn't exist, we'll gracefully skip enrichment and set all to UNKNOWN
        merchant_names_list = "', '".join([name.replace("'", "''") for name in merchant_names])
        
        # First, check if the column exists by querying information_schema
        try:
            with postgres_engine.connect() as conn:
                # Check if merchant_risk_level column exists
                column_check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'transactions_enriched' 
                      AND column_name = 'merchant_risk_level'
                """)
                column_result = conn.execute(column_check_query)
                column_exists = column_result.fetchone() is not None
                
                if not column_exists:
                    logger.debug("⚠️ merchant_risk_level column does not exist in transactions_enriched table, skipping enrichment")
                    # Set all to UNKNOWN since column doesn't exist
                    for result in snowflake_results:
                        result["MERCHANT_RISK_LEVEL"] = "UNKNOWN"
                    return snowflake_results
                
                # Column exists, proceed with enrichment query
                query = text(f"""
                    SELECT DISTINCT ON (merchant_name)
                        merchant_name,
                        merchant_risk_level
                    FROM transactions_enriched
                    WHERE merchant_name IN ('{merchant_names_list}')
                      AND merchant_risk_level IS NOT NULL
                    ORDER BY merchant_name, tx_datetime DESC NULLS LAST
                """)
                
                result = conn.execute(query)
                rows = result.fetchall()
                
                # Create a mapping of merchant_name -> merchant_risk_level
                merchant_risk_map = {row[0]: row[1] for row in rows}
                
                # Enrich Snowflake results with merchant risk levels
                for result in snowflake_results:
                    merchant_name = result.get("MERCHANT_NAME") or result.get("merchant_name")
                    if merchant_name and merchant_name in merchant_risk_map:
                        result["MERCHANT_RISK_LEVEL"] = merchant_risk_map[merchant_name]
                    else:
                        result["MERCHANT_RISK_LEVEL"] = "UNKNOWN"
                
                logger.debug(f"✅ Enriched {len(snowflake_results)} transactions with merchant risk levels from Postgres")
                return snowflake_results
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch merchant risk levels from Postgres (column may not exist): {e}")
            # Fallback: set all to UNKNOWN
            for result in snowflake_results:
                result["MERCHANT_RISK_LEVEL"] = "UNKNOWN"
            return snowflake_results
    
    async def _save_validation_results(
        self,
        validation_results: Dict[str, Any],
        investigation_folder: Path
    ) -> None:
        """Save validation results to investigation folder."""
        try:
            validation_file = investigation_folder / "merchant_validation_results.json"
            with open(validation_file, 'w', encoding='utf-8') as f:
                json.dump(validation_results, f, indent=2)
            logger.info(f"✅ Saved merchant validation results to {validation_file}")
        except Exception as e:
            logger.warning(f"Failed to save validation results: {e}")


# Global instance for reuse
_validation_service = None


async def get_validation_service() -> MerchantValidationService:
    """Get or create validation service instance."""
    global _validation_service
    if _validation_service is None:
        _validation_service = MerchantValidationService()
    return _validation_service

