#!/usr/bin/env python3
"""
Comprehensive file size analysis for Olorin codebase.
Identifies all production files exceeding 200 lines.
"""

import os
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Directories to exclude from analysis
EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '__pycache__',
    'vendor', 'coverage', '.pytest_cache', '.tox', 'venv',
    '.venv', 'env', '.env', 'htmlcov', '.mypy_cache',
    '.ruff_cache', 'site-packages', '.idea', '.vscode'
}

# File extensions to analyze (production code)
INCLUDE_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx'}

# Test file patterns to exclude from production analysis
TEST_PATTERNS = ['test_', '_test.', '.test.', '.spec.', '_spec.']

def is_test_file(filepath: Path) -> bool:
    """Check if file is a test file."""
    name = filepath.name.lower()
    return any(pattern in name for pattern in TEST_PATTERNS)

def should_analyze_file(filepath: Path) -> bool:
    """Determine if file should be analyzed."""
    # Check if it's a file with the right extension
    if not filepath.is_file() or filepath.suffix not in INCLUDE_EXTENSIONS:
        return False

    # Check if it's in an excluded directory
    for part in filepath.parts:
        if part in EXCLUDE_DIRS:
            return False

    # Exclude test files from production analysis
    if is_test_file(filepath):
        return False

    return True

def count_lines(filepath: Path) -> int:
    """Count non-empty lines in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            # Count all lines (including comments and whitespace)
            # as we cannot trim them per requirements
            return len(lines)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return 0

def analyze_file(filepath: Path) -> Dict:
    """Analyze a single file for size and complexity."""
    lines = count_lines(filepath)

    # Categorize by size
    if lines <= 200:
        size_category = "compliant"
    elif lines <= 300:
        size_category = "small_violation"
    elif lines <= 500:
        size_category = "medium_violation"
    elif lines <= 1000:
        size_category = "large_violation"
    else:
        size_category = "extreme_violation"

    return {
        'path': str(filepath),
        'lines': lines,
        'size_category': size_category,
        'extension': filepath.suffix,
        'module': filepath.parent.name,
        'relative_path': str(filepath.relative_to(Path('/Users/gklainert/Documents/olorin')))
    }

def scan_codebase() -> Tuple[List[Dict], Dict]:
    """Scan entire codebase and analyze files."""
    root = Path('/Users/gklainert/Documents/olorin')

    oversized_files = []
    statistics = defaultdict(int)
    category_files = defaultdict(list)

    # Scan all files
    for filepath in root.rglob('*'):
        if should_analyze_file(filepath):
            analysis = analyze_file(filepath)
            statistics['total_files'] += 1
            statistics[f'files_{analysis["size_category"]}'] += 1

            if analysis['lines'] > 200:
                oversized_files.append(analysis)
                category_files[analysis['size_category']].append(analysis)
            else:
                statistics['compliant_files'] += 1

    # Sort oversized files by line count (largest first)
    oversized_files.sort(key=lambda x: x['lines'], reverse=True)

    # Calculate statistics
    statistics['total_oversized'] = len(oversized_files)
    statistics['compliance_rate'] = (
        statistics['compliant_files'] / statistics['total_files'] * 100
        if statistics['total_files'] > 0 else 0
    )

    return oversized_files, dict(statistics), category_files

def generate_report():
    """Generate comprehensive analysis report."""
    print("=" * 80)
    print("OLORIN CODEBASE FILE SIZE COMPLIANCE ANALYSIS")
    print("=" * 80)
    print()

    oversized_files, stats, category_files = scan_codebase()

    # Print statistics
    print("SUMMARY STATISTICS")
    print("-" * 40)
    print(f"Total production files analyzed: {stats['total_files']}")
    print(f"Compliant files (≤200 lines): {stats.get('compliant_files', 0)}")
    print(f"Non-compliant files (>200 lines): {stats['total_oversized']}")
    print(f"Compliance rate: {stats['compliance_rate']:.1f}%")
    print()

    # Print category breakdown
    print("VIOLATION CATEGORIES")
    print("-" * 40)
    categories = [
        ('small_violation', '201-300 lines'),
        ('medium_violation', '301-500 lines'),
        ('large_violation', '501-1000 lines'),
        ('extreme_violation', '>1000 lines')
    ]

    for cat_key, cat_desc in categories:
        count = stats.get(f'files_{cat_key}', 0)
        if count > 0:
            print(f"{cat_desc}: {count} files")
    print()

    # Print top violators
    print("TOP 20 LARGEST FILES (CRITICAL REFACTORING TARGETS)")
    print("-" * 40)
    for i, file_info in enumerate(oversized_files[:20], 1):
        print(f"{i:2}. {file_info['relative_path']}")
        print(f"    Lines: {file_info['lines']} | Category: {file_info['size_category']}")

    if len(oversized_files) > 20:
        print(f"\n... and {len(oversized_files) - 20} more files")

    # Group by module/directory
    print("\n" + "=" * 80)
    print("FILES BY MODULE/DIRECTORY")
    print("-" * 40)

    module_groups = defaultdict(list)
    for file_info in oversized_files:
        # Extract module path (first two directories after olorin)
        parts = Path(file_info['relative_path']).parts
        if len(parts) >= 2:
            module = f"{parts[0]}/{parts[1]}"
        else:
            module = parts[0] if parts else 'root'
        module_groups[module].append(file_info)

    for module in sorted(module_groups.keys()):
        files = module_groups[module]
        total_lines = sum(f['lines'] for f in files)
        print(f"\n{module}: {len(files)} files, {total_lines} total lines")
        for file_info in sorted(files, key=lambda x: x['lines'], reverse=True)[:5]:
            print(f"  - {Path(file_info['relative_path']).name}: {file_info['lines']} lines")

    # Save detailed results to JSON
    output_file = Path('/Users/gklainert/Documents/olorin/scripts/file-size-analysis-results.json')
    with open(output_file, 'w') as f:
        json.dump({
            'statistics': stats,
            'oversized_files': oversized_files,
            'category_breakdown': {k: len(v) for k, v in category_files.items()}
        }, f, indent=2)

    print(f"\nDetailed results saved to: {output_file}")

    return oversized_files, stats

if __name__ == "__main__":
    generate_report()