#!/usr/bin/env python3
"""
Analyze recent investigations and confusion tables.

This script:
1. Lists recent investigations
2. Extracts confusion matrix data
3. Analyzes comparison results
4. Generates summary report
"""

import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence import list_investigations
from app.service.investigation.investigation_transaction_mapper import get_investigation_by_id
from app.service.investigation.comparison_service import calculate_confusion_matrix, aggregate_confusion_matrices
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def analyze_investigation(investigation: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze a single investigation."""
    inv_id = investigation.get('id', 'unknown')
    status = investigation.get('status', 'unknown')
    risk_score = investigation.get('overall_risk_score')
    entity_type = investigation.get('entity_type')
    entity_id = investigation.get('entity_id')
    updated = investigation.get('updated')
    
    # Extract progress_json data
    progress_json = investigation.get('progress_json')
    transaction_scores = None
    domain_findings = None
    
    if progress_json:
        try:
            if isinstance(progress_json, str):
                progress_data = json.loads(progress_json)
            else:
                progress_data = progress_json
            
            transaction_scores = progress_data.get('transaction_scores')
            domain_findings = progress_data.get('domain_findings', {})
            
            # Count domain findings
            domain_count = len(domain_findings) if isinstance(domain_findings, dict) else 0
            
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse progress_json for {inv_id}: {e}")
            progress_data = {}
    
    return {
        'id': inv_id,
        'status': status,
        'risk_score': risk_score,
        'entity_type': entity_type,
        'entity_id': entity_id,
        'updated': updated,
        'has_transaction_scores': transaction_scores is not None,
        'transaction_scores_count': len(transaction_scores) if transaction_scores else 0,
        'domain_findings_count': domain_count if 'domain_count' in locals() else 0,
    }


def main():
    """Main analysis function."""
    print("=" * 80)
    print("RECENT INVESTIGATIONS ANALYSIS")
    print("=" * 80)
    print()
    
    # Get all investigations
    try:
        investigations = list_investigations()
        print(f"Total investigations found: {len(investigations)}")
        print()
    except Exception as e:
        logger.error(f"Failed to list investigations: {e}", exc_info=True)
        return
    
    # Sort by updated date (most recent first)
    sorted_invs = sorted(
        investigations,
        key=lambda x: x.get('updated', '') or x.get('created', '') or '',
        reverse=True
    )
    
    # Analyze last 10 investigations
    recent_invs = sorted_invs[:10]
    
    print("=" * 80)
    print("LAST 10 INVESTIGATIONS")
    print("=" * 80)
    print()
    
    for i, inv in enumerate(recent_invs, 1):
        analysis = analyze_investigation(inv)
        print(f"{i}. Investigation: {analysis['id']}")
        print(f"   Status: {analysis['status']}")
        print(f"   Entity: {analysis['entity_type']}={analysis['entity_id']}")
        print(f"   Risk Score: {analysis['risk_score']}")
        print(f"   Updated: {analysis['updated']}")
        print(f"   Has Transaction Scores: {analysis['has_transaction_scores']} ({analysis['transaction_scores_count']} transactions)")
        print(f"   Domain Findings: {analysis['domain_findings_count']} domains")
        print()
    
    # Summary statistics
    print("=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print()
    
    completed = [inv for inv in investigations if inv.get('status') == 'completed']
    in_progress = [inv for inv in investigations if inv.get('status') == 'in_progress']
    with_scores = [inv for inv in investigations if analyze_investigation(inv)['has_transaction_scores']]
    
    print(f"Total Investigations: {len(investigations)}")
    print(f"  - Completed: {len(completed)}")
    print(f"  - In Progress: {len(in_progress)}")
    print(f"  - With Transaction Scores: {len(with_scores)}")
    print()
    
    # Risk score distribution
    risk_scores = [inv.get('overall_risk_score') for inv in investigations if inv.get('overall_risk_score') is not None]
    if risk_scores:
        print(f"Risk Score Distribution:")
        print(f"  - Min: {min(risk_scores):.3f}")
        print(f"  - Max: {max(risk_scores):.3f}")
        print(f"  - Avg: {sum(risk_scores) / len(risk_scores):.3f}")
        print()
    
    # Entity type distribution
    entity_types = {}
    for inv in investigations:
        et = inv.get('entity_type', 'unknown')
        entity_types[et] = entity_types.get(et, 0) + 1
    
    print("Entity Type Distribution:")
    for et, count in sorted(entity_types.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {et}: {count}")
    print()
    
    print("=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()

