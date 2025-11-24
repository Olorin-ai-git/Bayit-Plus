#!/usr/bin/env python3
"""
File Size Compliance Checker
Scans codebase for files exceeding 200-line limit.
Excludes: node_modules, build artifacts, .git, vendor, dist, etc.
"""
import os
from pathlib import Path
from typing import List, Tuple

# Directories to exclude from scanning
EXCLUDE_DIRS = {
    'node_modules', '.git', 'build', 'dist', 'vendor', '__pycache__',
    '.pytest_cache', '.mypy_cache', 'coverage', '.tox', '.venv', 'venv',
    'env', '.next', '.nuxt', 'out', 'target', '.DS_Store', '.idea',
    '.vscode', 'htmlcov', '.eggs', '*.egg-info', '.cache'
}

# File extensions to check
CODE_EXTENSIONS = {
    '.py', '.ts', '.tsx', '.js', '.jsx', '.java', '.go', '.rs',
    '.cpp', '.c', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
    '.kt', '.scala', '.sh', '.bash', '.zsh'
}

MAX_LINES = 200


def should_scan_file(file_path: Path) -> bool:
    """Determine if file should be scanned."""
    # Check if file has a code extension
    if file_path.suffix not in CODE_EXTENSIONS:
        return False
    
    # Check if file is in excluded directory
    parts = file_path.parts
    for part in parts:
        if part in EXCLUDE_DIRS or part.startswith('.'):
            return False
    
    return True


def count_lines(file_path: Path) -> int:
    """Count lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return 0


def scan_directory(base_path: Path) -> List[Tuple[Path, int]]:
    """Scan directory for oversized files."""
    oversized_files = []
    
    for file_path in base_path.rglob('*'):
        if not file_path.is_file():
            continue
        
        if not should_scan_file(file_path):
            continue
        
        line_count = count_lines(file_path)
        if line_count > MAX_LINES:
            oversized_files.append((file_path, line_count))
    
    return sorted(oversized_files, key=lambda x: x[1], reverse=True)


def main():
    """Run file size compliance scan."""
    print("=" * 80)
    print("FILE SIZE COMPLIANCE SCAN")
    print("=" * 80)
    print(f"\nScanning for files exceeding {MAX_LINES} lines...")
    print(f"Base directory: {Path.cwd()}")
    print()
    
    oversized_files = scan_directory(Path.cwd())
    
    if not oversized_files:
        print("✅ ALL FILES COMPLIANT!")
        print(f"No files exceed {MAX_LINES} lines.")
        print()
        print("=" * 80)
        return 0
    
    print(f"❌ FOUND {len(oversized_files)} OVERSIZED FILES:")
    print()
    
    total_excess_lines = 0
    for file_path, line_count in oversized_files:
        excess = line_count - MAX_LINES
        total_excess_lines += excess
        relative_path = file_path.relative_to(Path.cwd())
        print(f"  {relative_path}")
        print(f"    Lines: {line_count} (exceeds by {excess} lines)")
        print()
    
    print("=" * 80)
    print(f"Total oversized files: {len(oversized_files)}")
    print(f"Total excess lines: {total_excess_lines}")
    print()
    print("These files require refactoring to meet the 200-line limit.")
    print("=" * 80)
    
    return 1


if __name__ == "__main__":
    exit(main())
