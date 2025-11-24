#!/usr/bin/env python3
"""
Helper script to create a detector based on investigation findings.

This script helps you create a detector configuration based on anomalies
found in an investigation report. It maps investigation findings to detector
parameters (metrics, cohorts, etc.).

Usage:
    python scripts/create_detector_from_investigation.py --investigation-id <id>
    python scripts/create_detector_from_investigation.py --help
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import get_db
from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Available metrics from transaction_windows view
AVAILABLE_METRICS = [
    'tx_count',           # Transaction count
    'unique_users',       # Unique user count
    'unique_cards',       # Unique card count
    'unique_devices',     # Unique device count
    'amount_mean',        # Average transaction amount
    'amount_p90',         # 90th percentile transaction amount
    'amount_std',         # Standard deviation of amounts
    'decline_rate',       # Proportion of declined transactions
    'refund_rate',        # Proportion of refunded transactions
    'cnp_share',          # Card-not-present share
    'tx_per_user',        # Average transactions per user
    'method_share_card',  # Card payment method share
    'method_share_ach',   # ACH payment method share
    'method_share_alt',   # Alternative payment method share
]

# Available cohort dimensions (mapped from transaction_windows)
AVAILABLE_COHORTS = {
    'merchant_id': 'store_id',      # Maps to store_id in view
    'channel': 'device_type',       # Maps to device_type in view
    'geo': 'ip_country_code',       # Maps to ip_country_code in view
}

# Detector types
DETECTOR_TYPES = ['stl_mad', 'cusum', 'isoforest', 'rcf', 'matrix_profile']

# Default detector params by type
DEFAULT_PARAMS = {
    'stl_mad': {
        'period': 672,  # 7 days in 15-min windows
        'robust': True,
        'k': 3.5,
        'persistence': 2,
        'min_support': 50
    },
    'cusum': {
        'delta': 0.75,  # Will be multiplied by std
        'threshold': 5.0,  # Will be multiplied by std
        'k': 3.5,
        'persistence': 2,
        'min_support': 50
    },
    'isoforest': {
        'n_estimators': 200,
        'contamination': 0.005,
        'k': 3.5,
        'persistence': 2,
        'min_support': 50
    },
    'rcf': {
        'n_estimators': 200,
        'contamination': 0.005,
        'k': 3.5,
        'persistence': 2,
        'min_support': 50
    },
    'matrix_profile': {
        'window_size': 96,  # 24 hours in 15-min windows
        'k': 3.5,
        'persistence': 2,
        'min_support': 50
    }
}


def extract_metrics_from_investigation(investigation_id: str) -> List[str]:
    """
    Extract relevant metrics from investigation findings.
    
    This analyzes the investigation report/findings to identify which
    metrics were anomalous. You may need to manually review the report
    and specify metrics.
    """
    db = next(get_db())
    try:
        investigation = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if not investigation:
            logger.error(f"Investigation {investigation_id} not found")
            return []
        
        # Get investigation settings and progress
        settings = investigation.settings or {}
        progress = investigation.get_progress_data()
        
        # Try to extract metrics from investigation metadata
        # Check if investigation was created from an anomaly
        metadata = settings.get('metadata', {})
        if 'metric' in metadata:
            return [metadata['metric']]
        
        # Check progress for metric mentions
        # This is a heuristic - you may need to manually review
        findings = progress.get('findings', {})
        if isinstance(findings, dict):
            # Look for common metric indicators
            metrics_found = []
            findings_str = json.dumps(findings).lower()
            
            for metric in AVAILABLE_METRICS:
                if metric.lower() in findings_str:
                    metrics_found.append(metric)
            
            if metrics_found:
                return metrics_found
        
        return []
    finally:
        db.close()


def extract_cohorts_from_investigation(investigation_id: str) -> List[str]:
    """
    Extract cohort dimensions from investigation.
    
    Analyzes investigation settings to determine which cohort dimensions
    were relevant (geo, merchant_id, channel, etc.)
    """
    db = next(get_db())
    try:
        investigation = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if not investigation:
            logger.error(f"Investigation {investigation_id} not found")
            return []
        
        settings = investigation.settings or {}
        
        # Check if investigation was created from an anomaly
        metadata = settings.get('metadata', {})
        cohort = metadata.get('cohort', {})
        
        if cohort:
            # Map cohort keys to detector cohort_by values
            cohorts = []
            for key in cohort.keys():
                if key in AVAILABLE_COHORTS:
                    cohorts.append(key)
            if cohorts:
                return cohorts
        
        # Default: use geo if entity has location info
        entities = settings.get('entities', [])
        if entities:
            # Check if any entity has geo/location info
            for entity in entities:
                entity_type = entity.get('entity_type', '')
                if entity_type in ['ip', 'device_id']:
                    return ['geo']
                elif entity_type == 'email':
                    return ['geo', 'merchant_id']
        
        # Default cohort
        return ['geo']
    finally:
        db.close()


def suggest_detector_config(
    investigation_id: str,
    metrics: Optional[List[str]] = None,
    cohorts: Optional[List[str]] = None,
    detector_type: str = 'stl_mad'
) -> Dict[str, Any]:
    """
    Suggest detector configuration based on investigation.
    
    Args:
        investigation_id: Investigation ID to analyze
        metrics: Optional list of metrics (if None, will try to extract)
        cohorts: Optional list of cohorts (if None, will try to extract)
        detector_type: Detector algorithm type
    
    Returns:
        Detector configuration dictionary
    """
    if not metrics:
        metrics = extract_metrics_from_investigation(investigation_id)
        if not metrics:
            logger.warning("Could not extract metrics automatically. Using defaults.")
            metrics = ['tx_count', 'decline_rate']  # Common fraud indicators
    
    if not cohorts:
        cohorts = extract_cohorts_from_investigation(investigation_id)
        if not cohorts:
            logger.warning("Could not extract cohorts automatically. Using defaults.")
            cohorts = ['geo']  # Default cohort
    
    # Validate metrics
    valid_metrics = [m for m in metrics if m in AVAILABLE_METRICS]
    if not valid_metrics:
        logger.warning(f"None of the specified metrics are valid. Using defaults.")
        valid_metrics = ['tx_count']
    
    # Validate cohorts
    valid_cohorts = [c for c in cohorts if c in AVAILABLE_COHORTS]
    if not valid_cohorts:
        logger.warning(f"None of the specified cohorts are valid. Using defaults.")
        valid_cohorts = ['geo']
    
    # Get default params for detector type
    params = DEFAULT_PARAMS.get(detector_type, DEFAULT_PARAMS['stl_mad']).copy()
    
    # Add severity thresholds (optional)
    params['severity_thresholds'] = {
        'info_max': 3.0,
        'warn_max': 4.5,
        'critical_min': 4.5
    }
    
    db = next(get_db())
    try:
        investigation = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()
        
        if investigation:
            settings = investigation.settings or {}
            name = settings.get('name', f'Investigation {investigation_id[:8]}')
            detector_name = f"Detector: {name}"
        else:
            detector_name = f"Detector from Investigation {investigation_id[:8]}"
    finally:
        db.close()
    
    return {
        'name': detector_name,
        'type': detector_type,
        'cohort_by': valid_cohorts,
        'metrics': valid_metrics,
        'params': params,
        'enabled': True
    }


def print_detector_config(config: Dict[str, Any]):
    """Print detector configuration in a readable format."""
    print("\n" + "="*70)
    print("DETECTOR CONFIGURATION")
    print("="*70)
    print(f"\nName: {config['name']}")
    print(f"Type: {config['type']}")
    print(f"\nCohort Dimensions: {', '.join(config['cohort_by'])}")
    print(f"Metrics: {', '.join(config['metrics'])}")
    print(f"\nParameters:")
    for key, value in config['params'].items():
        if isinstance(value, dict):
            print(f"  {key}:")
            for k, v in value.items():
                print(f"    {k}: {v}")
        else:
            print(f"  {key}: {value}")
    print(f"\nEnabled: {config['enabled']}")
    print("\n" + "="*70)
    print("\nJSON for API request:")
    print(json.dumps(config, indent=2))
    print("\n" + "="*70)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Create detector configuration from investigation findings"
    )
    parser.add_argument(
        '--investigation-id',
        required=True,
        help='Investigation ID to analyze'
    )
    parser.add_argument(
        '--metrics',
        nargs='+',
        help='Metrics to monitor (e.g., tx_count decline_rate). If not specified, will try to extract from investigation.'
    )
    parser.add_argument(
        '--cohorts',
        nargs='+',
        choices=list(AVAILABLE_COHORTS.keys()),
        help='Cohort dimensions (e.g., geo merchant_id channel). If not specified, will try to extract from investigation.'
    )
    parser.add_argument(
        '--detector-type',
        choices=DETECTOR_TYPES,
        default='stl_mad',
        help='Detector algorithm type (default: stl_mad)'
    )
    parser.add_argument(
        '--create',
        action='store_true',
        help='Actually create the detector (otherwise just prints config)'
    )
    
    args = parser.parse_args()
    
    try:
        config = suggest_detector_config(
            investigation_id=args.investigation_id,
            metrics=args.metrics,
            cohorts=args.cohorts,
            detector_type=args.detector_type
        )
        
        print_detector_config(config)
        
        if args.create:
            from app.models.anomaly import Detector
            import uuid
            
            db = next(get_db())
            try:
                detector = Detector(
                    name=config['name'],
                    type=config['type'],
                    cohort_by=config['cohort_by'],
                    metrics=config['metrics'],
                    params=config['params'],
                    enabled=config['enabled']
                )
                db.add(detector)
                db.commit()
                db.refresh(detector)
                print(f"\n✅ Detector created successfully!")
                print(f"   ID: {detector.id}")
                print(f"   Name: {detector.name}")
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to create detector: {e}", exc_info=True)
                print(f"\n❌ Failed to create detector: {e}")
                sys.exit(1)
            finally:
                db.close()
        else:
            print("\n💡 To create this detector, run with --create flag")
            print(f"   Or use the API: POST /api/v1/analytics/detectors")
            print(f"   Body: {json.dumps(config, indent=2)}")
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

