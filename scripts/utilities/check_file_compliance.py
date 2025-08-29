#!/usr/bin/env python3
"""
File Size Compliance Checker for Olorin Codebase
Checks that all production code files have less than 200 lines.
"""

import os
from pathlib import Path
from typing import Dict, List, Tuple

# Directories to exclude from line count check
EXCLUDED_DIRS = {
    'node_modules', '.git', '__pycache__', 'build', 'dist', 
    'coverage', '.pytest_cache', '.venv', 'venv', 'env',
    'reports', 'logs', '.next', '.nuxt', 'target',
    'gaia-webplugin', 'docs'  # Excluding these as per requirement
}

# File extensions to check
EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.vue', '.go', '.rs', '.java'}

def should_exclude_path(path: Path) -> bool:
    """Check if a path should be excluded from the analysis."""
    parts = path.parts
    for part in parts:
        if part.startswith('.') and part not in {'.env', '.env.example'}:
            return True
        if part in EXCLUDED_DIRS:
            return True
    return False

def count_lines_in_file(file_path: Path) -> int:
    """Count the number of lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def analyze_codebase(root_path: str) -> Tuple[List[Tuple[str, int]], Dict[str, int]]:
    """
    Analyze the codebase for file size compliance.
    Returns violations and statistics.
    """
    violations = []
    stats = {'total_files': 0, 'compliant_files': 0, 'violations': 0}
    
    root = Path(root_path)
    
    for file_path in root.rglob('*'):
        if not file_path.is_file():
            continue
            
        if file_path.suffix not in EXTENSIONS:
            continue
            
        if should_exclude_path(file_path):
            continue
            
        line_count = count_lines_in_file(file_path)
        stats['total_files'] += 1
        
        if line_count > 200:
            relative_path = file_path.relative_to(root)
            violations.append((str(relative_path), line_count))
            stats['violations'] += 1
        else:
            stats['compliant_files'] += 1
    
    return violations, stats

def main():
    """Main function to run the compliance check."""
    root_path = "/Users/gklainert/Documents/olorin"
    
    print("🔍 Checking file size compliance (200-line limit)...")
    print(f"📂 Root path: {root_path}")
    print("=" * 80)
    
    violations, stats = analyze_codebase(root_path)
    
    # Print violations
    if violations:
        print("❌ FILES VIOLATING 200-LINE LIMIT:")
        print("-" * 50)
        violations.sort(key=lambda x: x[1], reverse=True)  # Sort by line count
        
        for file_path, line_count in violations:
            excess_lines = line_count - 200
            print(f"📄 {file_path}")
            print(f"   Lines: {line_count} (excess: +{excess_lines})")
            print()
    else:
        print("✅ All files comply with the 200-line limit!")
    
    # Print statistics
    print("=" * 80)
    print("📊 COMPLIANCE STATISTICS:")
    print(f"   Total files analyzed: {stats['total_files']}")
    print(f"   Compliant files: {stats['compliant_files']}")
    print(f"   Violations: {stats['violations']}")
    
    if stats['total_files'] > 0:
        compliance_rate = (stats['compliant_files'] / stats['total_files']) * 100
        print(f"   Compliance rate: {compliance_rate:.1f}%")
    
    if violations:
        print("\n🚨 CRITICAL FINDING:")
        print(f"   {len(violations)} files exceed the mandatory 200-line limit.")
        print("   These files must be refactored before deployment.")

if __name__ == "__main__":
    main()