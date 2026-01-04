#!/usr/bin/env python3
"""
File Size Compliance Checker for Olorin
Automated script to verify all production files meet 200-line requirement.
Designed for CI/CD pipeline integration.
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple
import argparse

# Maximum allowed lines per file
MAX_LINES = 200

# Directories to exclude from analysis
EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '__pycache__',
    'vendor', 'coverage', '.pytest_cache', '.tox', 'venv',
    '.venv', 'env', '.env', 'htmlcov', '.mypy_cache',
    '.ruff_cache', 'site-packages', '.idea', '.vscode',
    'docs', 'test', 'tests'  # Exclude documentation and test directories
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
    """Count total lines in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except (UnicodeDecodeError, PermissionError):
        # Skip files that can't be read
        return 0

def find_oversized_files(root_dir: Path, max_lines: int = MAX_LINES) -> List[Tuple[Path, int]]:
    """Find all production files exceeding the line limit."""
    oversized_files = []

    for filepath in root_dir.rglob('*'):
        if should_analyze_file(filepath):
            line_count = count_lines(filepath)
            if line_count > max_lines:
                oversized_files.append((filepath, line_count))

    return sorted(oversized_files, key=lambda x: x[1], reverse=True)

def main():
    parser = argparse.ArgumentParser(description='Check file size compliance')
    parser.add_argument('--root', default='.', help='Root directory to scan (default: current directory)')
    parser.add_argument('--max-lines', type=int, default=MAX_LINES, help=f'Maximum lines per file (default: {MAX_LINES})')
    parser.add_argument('--fail-on-violation', action='store_true', help='Exit with error code if violations found')
    parser.add_argument('--quiet', action='store_true', help='Only output violations')

    args = parser.parse_args()

    root_path = Path(args.root).resolve()
    max_lines = args.max_lines

    if not args.quiet:
        print(f"🔍 Scanning {root_path} for files exceeding {max_lines} lines...")
        print()

    oversized_files = find_oversized_files(root_path, max_lines)

    if not oversized_files:
        if not args.quiet:
            print("✅ All production files comply with the 200-line limit!")
        sys.exit(0)

    # Report violations
    print(f"🚨 Found {len(oversized_files)} files exceeding {max_lines} lines:")
    print()

    total_excess_lines = 0
    for filepath, line_count in oversized_files:
        excess_lines = line_count - max_lines
        total_excess_lines += excess_lines
        relative_path = filepath.relative_to(root_path)
        print(f"  {line_count:4d} lines: {relative_path}")

    print()
    print(f"📊 Total violations: {len(oversized_files)} files")
    print(f"📏 Total excess lines: {total_excess_lines:,}")
    print(f"🎯 Target: 0 violations")

    if args.fail_on_violation:
        print()
        print("❌ File size compliance check FAILED")
        sys.exit(1)

    sys.exit(0)

if __name__ == '__main__':
    main()