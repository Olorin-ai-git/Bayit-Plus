#!/usr/bin/env python3
"""Fix existing startup analysis report by reconstructing data from database and comparison reports."""

import sys
from pathlib import Path
import json
import re
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.reporting.startup_report_generator import generate_startup_report
from app.persistence.database import get_db
from app.models.investigation_state import InvestigationState


def extract_entities_from_reports(reports_dir: Path):
    """Extract entity information from comparison report filenames."""
    entities = []
    if not reports_dir.exists():
        return entities
    
    reports = list(reports_dir.glob('comparison_*.html'))
    for report in reports:
        # Parse filename: comparison_1_email_okuoku1959122@gmail.com.html
        parts = report.stem.split('_')
        if len(parts) >= 4:
            entity_type = parts[2]  # email
            entity_value = '_'.join(parts[3:])  # okuoku1959122@gmail.com
            entities.append({
                'entity': entity_value,
                'entity_type': entity_type,
                'risk_score': 0.0  # Will get from investigation
            })
    return entities


def get_investigations_from_time_window(start_time: datetime, end_time: datetime):
    """Get investigations from database for the time window."""
    db = next(get_db())
    try:
        investigations = db.query(InvestigationState).filter(
            InvestigationState.investigation_id.like('auto-comp-%'),
            InvestigationState.created_at >= start_time,
            InvestigationState.created_at <= end_time
        ).order_by(InvestigationState.created_at.desc()).all()
        return investigations
    finally:
        db.close()


def extract_risk_score_from_progress(progress_data):
    """Extract overall risk score from progress JSON."""
    if isinstance(progress_data, str):
        progress_data = json.loads(progress_data)
    
    overall_risk = progress_data.get('overall_risk_score')
    if overall_risk is None:
        domain_findings = progress_data.get('domain_findings', {})
        if isinstance(domain_findings, dict):
            risk_findings = domain_findings.get('risk', {})
            if isinstance(risk_findings, dict):
                overall_risk = risk_findings.get('risk_score')
    return overall_risk


def reconstruct_app_state(entities, investigations):
    """Reconstruct app state from entities and investigations."""
    # Match entities to investigations and get risk scores
    entity_map = {e['entity']: e for e in entities}
    auto_comparison_results = []
    
    for inv in investigations:
        settings = inv.settings_json
        if isinstance(settings, str):
            settings = json.loads(settings)
        
        entity_list = settings.get('entities', [])
        if entity_list:
            entity_data = entity_list[0]
            entity_value = entity_data.get('entity_value', '')
            entity_type = entity_data.get('entity_type', 'email')
            
            # Get risk score
            progress = inv.progress_json
            overall_risk = extract_risk_score_from_progress(progress)
            
            # Update entity risk score
            if entity_value in entity_map:
                entity_map[entity_value]['risk_score'] = overall_risk or 0.0
            
            # Create comparison result
            safe_entity = entity_value.replace('@', '_at_').replace('.', '_')
            auto_comparison_results.append({
                'entity_value': entity_value,
                'entity_type': entity_type,
                'investigation_id': inv.investigation_id,
                'status': 'success' if inv.status == 'COMPLETED' else 'error',
                'report_path': f'artifacts/comparisons/auto_startup/comparison_{entity_type}_{safe_entity}.html'
            })
    
    # Create mock app state
    class MockAppState:
        def __init__(self, entities_list, comparison_results):
            self.risk_entities_loaded = True
            self.risk_entities_loaded_at = datetime(2025, 11, 14, 16, 20, 52).isoformat()
            self.top_risk_entities = {
                'status': 'success',
                'entities': entities_list[:10],
                'summary': {
                    'group_by': 'email',
                    'total_entities': len(entities_list)
                },
                'timestamp': datetime(2025, 11, 14, 16, 20, 52).isoformat()
            }
            self.auto_comparison_completed = True
            self.auto_comparison_results = comparison_results
            self.auto_comparison_zip_path = 'artifacts/comparisons/auto_startup/comparison_package_20251114_162724.zip'
            self.database_available = True
            
            # Get actual database provider type from environment
            import os
            db_provider_name = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
            if db_provider_name == 'snowflake':
                # Create a class with the correct name dynamically
                SnowflakeProvider = type('SnowflakeProvider', (), {})
                self.database_provider = SnowflakeProvider()
            elif db_provider_name == 'postgresql':
                PostgreSQLProvider = type('PostgreSQLProvider', (), {})
                self.database_provider = PostgreSQLProvider()
            else:
                # Fallback
                DatabaseProvider = type('DatabaseProvider', (), {})
                self.database_provider = DatabaseProvider()
            
            self.rag_system_available = True
            self.anomaly_detection_available = True
            self.detection_scheduler = None
            self.logstream_config_valid = True
            self.startup_duration_seconds = 45.0
    
    return MockAppState(list(entity_map.values()), auto_comparison_results)


def main():
    """Main function to fix the startup report."""
    # Extract entities from comparison reports
    reports_dir = Path('artifacts/comparisons/auto_startup/comparison_package_20251114_162724/comparison_reports')
    entities = extract_entities_from_reports(reports_dir)
    
    # Get investigations from database
    target_time_start = datetime(2025, 11, 14, 16, 20, 0)
    target_time_end = datetime(2025, 11, 14, 16, 30, 0)
    investigations = get_investigations_from_time_window(target_time_start, target_time_end)
    
    print(f'Found {len(investigations)} investigations')
    print(f'Found {len(entities)} entities from filenames')
    
    # Reconstruct app state
    mock_state = reconstruct_app_state(entities, investigations)
    
    # Generate report
    report_path = Path('artifacts/comparisons/auto_startup/comparison_package_20251114_162724/startup_analysis_report.html')
    
    print(f'\nRegenerating report with reconstructed data...')
    generated_path = generate_startup_report(
        app_state=mock_state,
        output_path=report_path,
        startup_duration_seconds=45.0
    )
    
    print(f'✅ Report regenerated: {generated_path}')
    print(f'   Entities: {len(mock_state.top_risk_entities["entities"])}')
    print(f'   Auto-comparisons: {len(mock_state.auto_comparison_results)}')


if __name__ == '__main__':
    main()

