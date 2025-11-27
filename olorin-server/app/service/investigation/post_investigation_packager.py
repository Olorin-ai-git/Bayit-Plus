#!/usr/bin/env python3
"""
Post-Investigation Package Generator

Automatically creates confusion matrix and complete investigation package
after each investigation completes.

This module is called as a post-completion hook to ensure every investigation
has a complete artifact package including:
- Confusion matrix HTML report
- Investigation folder with all logs and results
- Comparison reports
- Complete ZIP package

Author: Olorin Fraud Detection System
"""

import asyncio
import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from zipfile import ZipFile, ZIP_DEFLATED

logger = logging.getLogger(__name__)


async def generate_post_investigation_package(
    investigation_id: str,
    investigation_folder: Optional[Path] = None,
) -> Optional[Path]:
    """
    Generate confusion matrix ONLY for investigation (no ZIP package).
    
    This function:
    1. Generates confusion matrix HTML
    2. Returns path to confusion matrix
    
    Args:
        investigation_id: Investigation ID
        investigation_folder: Optional investigation folder path
        
    Returns:
        Path to generated confusion matrix HTML, or None if generation failed
    """
    try:
        logger.info(f"📊 Generating confusion matrix for {investigation_id}")
        
        # Generate confusion matrix ONLY (no ZIP package)
        confusion_matrix_path = await _generate_confusion_matrix(
            investigation_id, investigation_folder
        )
        
        if not confusion_matrix_path:
            logger.warning(
                f"⚠️ Could not generate confusion matrix for {investigation_id}"
            )
            return None
        else:
            logger.info(f"✅ Confusion matrix generated: {confusion_matrix_path}")
        
        return confusion_matrix_path
        
    except Exception as e:
        logger.error(
            f"❌ Failed to generate confusion matrix for {investigation_id}: {e}",
            exc_info=True
        )
        return None


async def _generate_confusion_matrix(
    investigation_id: str,
    investigation_folder: Optional[Path] = None,
) -> Optional[Path]:
    """Generate confusion matrix HTML for investigation."""
    try:
        from app.service.investigation.confusion_table_generator import (
            generate_confusion_table_for_investigation
        )
        
        logger.info(f"📊 Generating confusion matrix for {investigation_id}")
        
        html_path = await generate_confusion_table_for_investigation(
            investigation_id=investigation_id,
            investigation_folder=investigation_folder
        )
        
        return html_path
        
    except Exception as e:
        logger.error(f"❌ Failed to generate confusion matrix: {e}", exc_info=True)
        return None


async def _create_investigation_package(
    investigation_id: str,
    investigation_folder: Optional[Path] = None,
    confusion_matrix_path: Optional[Path] = None,
) -> Optional[Path]:
    """Create complete ZIP package for investigation (organized, no duplicates)."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Determine investigation folder
        if investigation_folder is None:
            investigation_folder = _resolve_investigation_folder(investigation_id)
        
        if not investigation_folder or not investigation_folder.exists():
            logger.warning(f"⚠️ Investigation folder not found for {investigation_id}")
            return None
        
        # Create package directory
        packages_dir = Path("artifacts/packages")
        packages_dir.mkdir(parents=True, exist_ok=True)
        
        package_name = f"investigation_{investigation_id}_{timestamp}.zip"
        package_path = packages_dir / package_name
        
        logger.info(f"📦 Creating investigation package: {package_name}")
        
        # Create ZIP file with organized structure
        with ZipFile(package_path, 'w', ZIP_DEFLATED) as zipf:
            # Add investigation folder (contains JSON artifacts - no duplication needed)
            _add_directory_to_zip(
                zipf, 
                investigation_folder, 
                f"{investigation_id}/investigation"
            )
            
            # Add confusion matrix
            if confusion_matrix_path and confusion_matrix_path.exists():
                zipf.write(
                    confusion_matrix_path,
                    f"{investigation_id}/confusion_matrix.html"
                )
            
                # Add comparison reports (HTML only - no JSON duplicates)
            comparison_reports = _find_comparison_reports(investigation_id, investigation_folder)
            for report_path in comparison_reports:
                # Only add HTML comparison reports, not JSON artifacts
                if report_path.suffix == '.html':
                    zipf.write(
                        report_path,
                        f"{investigation_id}/comparison_reports/{report_path.name}"
                    )
            
            # Investigation artifacts already in investigation folder - no separate copy needed
            
            # Create README
            readme_content = _generate_package_readme(
                investigation_id,
                confusion_matrix_path is not None,
                len([r for r in comparison_reports if r.suffix == '.html']),
                investigation_folder
            )
            zipf.writestr(f"{investigation_id}/README.md", readme_content)
        
        logger.info(f"✅ Package created: {package_path}")
        logger.info(f"   Size: {_format_size(package_path.stat().st_size)}")
        
        return package_path
        
    except Exception as e:
        logger.error(f"❌ Failed to create investigation package: {e}", exc_info=True)
        return None


def _resolve_investigation_folder(investigation_id: str) -> Optional[Path]:
    """Resolve investigation folder path from ID."""
    try:
        from app.service.logging.investigation_folder_manager import (
            get_folder_manager
        )
        
        folder_manager = get_folder_manager()
        folder_path = folder_manager.get_investigation_folder(investigation_id)
        
        return folder_path
        
    except Exception as e:
        logger.error(f"❌ Failed to resolve investigation folder: {e}")
        return None


def _find_comparison_reports(
    investigation_id: str, 
    investigation_folder: Optional[Path] = None
) -> list[Path]:
    """Find all comparison reports for investigation (HTML only, not confusion tables)."""
    reports = []
    
    # Use provided folder or resolve it
    inv_folder = investigation_folder if investigation_folder else _resolve_investigation_folder(investigation_id)
    if not inv_folder or not inv_folder.exists():
        return reports
    
    artifacts_dir = inv_folder / "artifacts"
    if not artifacts_dir.exists():
        return reports
    
    # Extract entity from investigation artifact filename
    entity_identifier = None
    for artifact in artifacts_dir.glob("investigation_*.json"):
        # Format: investigation_email_entity-at-domain-com_dates.json
        # Extract the entity part
        filename = artifact.stem  # Remove .json
        parts = filename.split('_')
        if len(parts) >= 3:
            # Join parts between "email" and the date parts (last 2)
            entity_identifier = '_'.join(parts[2:-2])
            break
    
    if not entity_identifier:
        return reports
    
    # Find comparison reports by entity identifier
    comparison_dir = Path("artifacts/comparisons/auto_startup")
    if comparison_dir.exists():
        # Find HTML comparison reports (starts with "comparison_email_")
        for html_file in comparison_dir.rglob(f"comparison_email_{entity_identifier}_*.html"):
            reports.append(html_file)
    
    return reports


def _find_investigation_artifacts(investigation_id: str) -> list[Path]:
    """Find all investigation artifacts (JSON files)."""
    artifacts = []
    
    # Check artifacts/investigations/
    artifacts_dir = Path("artifacts/investigations")
    if artifacts_dir.exists():
        # Find investigation JSON artifacts
        for json_file in artifacts_dir.rglob(f"*{investigation_id}*.json"):
            artifacts.append(json_file)
    
    return artifacts


def _add_directory_to_zip(zipf: ZipFile, directory: Path, arcname: str) -> None:
    """Recursively add directory to ZIP file."""
    for item in directory.rglob("*"):
        if item.is_file():
            # Calculate relative path
            rel_path = item.relative_to(directory)
            zip_path = f"{arcname}/{rel_path}"
            zipf.write(item, zip_path)


def _generate_package_readme(
    investigation_id: str,
    has_confusion_matrix: bool,
    num_comparison_reports: int,
    investigation_folder: Optional[Path] = None,
) -> str:
    """Generate README content for investigation package."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Count artifacts in investigation folder
    num_artifacts = 0
    if investigation_folder and investigation_folder.exists():
        artifacts_dir = investigation_folder / "artifacts"
        if artifacts_dir.exists():
            num_artifacts = len(list(artifacts_dir.glob("*.json")))
    
    return f"""# Investigation Package: {investigation_id}

**Generated**: {timestamp}  
**System**: Olorin Fraud Detection Platform  
**Version**: Pattern Enhancement v1.0

---

## Package Structure (Optimized - No Duplicates)

```
{investigation_id}/
├── README.md                          # This file
├── confusion_matrix.html              # Performance metrics
├── investigation/                     # Complete investigation folder
│   ├── artifacts/                    # Investigation JSON artifacts ({num_artifacts} files)
│   │   └── investigation_*.json
│   ├── journey_tracking.json         # Investigation execution flow
│   └── metadata.json                 # Investigation configuration
└── comparison_reports/               # Transaction-level analysis
    └── comparison_*.html             # HTML reports ({num_comparison_reports} files)
```

---

## Package Contents

### 📁 /investigation/
**Complete investigation folder** with all data:
- **artifacts/**: Domain agent analysis results, risk scores, pattern detections
- **journey_tracking.json**: Step-by-step investigation execution
- **metadata.json**: Investigation configuration and settings
- **server_logs/**: Complete execution logs (if available)

### 📊 /confusion_matrix.html
{f'✅ **Confusion matrix HTML report included**' if has_confusion_matrix else '❌ **Confusion matrix not available**'}

Performance metrics:
- Precision: % of fraud predictions that were correct
- Recall: % of actual fraud that was detected  
- F1 Score: Harmonic mean of precision and recall
- Accuracy: % of all predictions that were correct
- Statistical confidence intervals (95% CI)

### 📈 /comparison_reports/ ({num_comparison_reports} HTML files)
**Transaction-level comparison reports**:
- Transaction-by-transaction predictions
- Risk scores and confidence levels
- Actual vs. predicted outcomes
- Visual highlighting of TP/FP/TN/FN

---

## Quick Start

### 1. View Confusion Matrix
```bash
open confusion_matrix.html
```

### 2. Review Investigation Data
```bash
cat investigation/artifacts/investigation_*.json | jq .
```

### 3. Check Comparison Reports
```bash
open comparison_reports/comparison_*.html
```

### 4. Examine Investigation Flow
```bash
cat investigation/journey_tracking.json | jq .
```

---

## Investigation Details

| Item | Value |
|------|-------|
| **Investigation ID** | `{investigation_id}` |
| **Confusion Matrix** | {'✅ Included' if has_confusion_matrix else '❌ Not available'} |
| **Comparison Reports** | {num_comparison_reports} HTML files |
| **Investigation Artifacts** | {num_artifacts} JSON files |
| **Package Created** | {timestamp} |

---

## Key Features of This Package

✅ **No Duplicates**: Investigation artifacts appear only once  
✅ **Organized Structure**: Clear folder hierarchy  
✅ **Complete Data**: All artifacts preserved  
✅ **Portable**: Single ZIP file easy to share  
✅ **Audit-Ready**: Complete investigation trail  

---

## Pattern Enhancement Results

This investigation was analyzed using pattern-based fraud detection enhancements:

1. **Repeated Amount Detection** (+15% risk boost)
   - Triggers when >50% of transactions have identical amounts

2. **Velocity Burst Penalties** (+10% risk boost)
   - Triggers when transactions occur <5 minutes apart

3. **IP Rotation Detection** (+10% risk boost)
   - Triggers when >3 different IPs access same device

4. **High Rejection Rate** (+5% risk boost)
   - Triggers when >25% of transactions are rejected

---

## Support

For questions about this investigation or the fraud detection system:

- **System**: Olorin Fraud Detection Platform
- **Documentation**: See `/investigation/` folder for complete details
- **Pattern Detection**: Check investigation artifacts for pattern analysis

---

**Olorin Fraud Detection Platform**  
Pattern Enhancement v1.0 with Automated Packaging
"""


def _format_size(size_bytes: int) -> str:
    """Format byte size to human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"

