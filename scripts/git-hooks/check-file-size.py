#!/usr/bin/env python3
"""
Pre-commit hook to check file size compliance (200 line limit).

Constitutional Compliance:
- Enforces 200-line limit per file
- Reports violations with file paths and line counts
- Excludes test files and generated files
"""

import sys
import os
from pathlib import Path


def check_file_size(file_path: str, max_lines: int = 200) -> tuple[bool, int]:
    """
    Check if a file exceeds the maximum line count.

    Args:
        file_path: Path to the file
        max_lines: Maximum allowed lines (default: 200)

    Returns:
        Tuple of (is_compliant, line_count)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            line_count = sum(1 for _ in f)
        return line_count <= max_lines, line_count
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return False, 0


def should_check_file(file_path: str) -> bool:
    """
    Determine if a file should be checked.

    Args:
        file_path: Path to the file

    Returns:
        True if file should be checked, False otherwise
    """
    # Exclude test files
    if '/test' in file_path or '/tests/' in file_path:
        return False
    
    # Exclude generated files
    if '__pycache__' in file_path or '.pyc' in file_path:
        return False
    
    # Exclude node_modules
    if 'node_modules' in file_path:
        return False
    
    # Only check Python and TypeScript files
    if not (file_path.endswith('.py') or file_path.endswith('.ts') or 
            file_path.endswith('.tsx') or file_path.endswith('.js') or
            file_path.endswith('.jsx')):
        return False
    
    return True


def main():
    """Main entry point for the hook."""
    max_lines = int(os.getenv('MAX_FILE_LINES', '200'))
    violations = []
    
    # Get list of staged files from git
    import subprocess
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            capture_output=True,
            text=True,
            check=True
        )
        staged_files = result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        # If git command fails, check all files in current directory
        staged_files = []
        for root, dirs, files in os.walk('.'):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for file in files:
                staged_files.append(os.path.join(root, file))
    
    # Filter and check files
    for file_path in staged_files:
        if not file_path or not should_check_file(file_path):
            continue
        
        if not os.path.exists(file_path):
            continue
        
        is_compliant, line_count = check_file_size(file_path, max_lines)
        if not is_compliant:
            violations.append((file_path, line_count))
    
    # Report violations
    if violations:
        print(f"\n❌ File size violations detected ({max_lines} line limit):\n", file=sys.stderr)
        for file_path, line_count in violations:
            print(f"  {file_path}: {line_count} lines (exceeds limit by {line_count - max_lines})", file=sys.stderr)
        print(f"\nPlease split these files to comply with the {max_lines}-line limit.", file=sys.stderr)
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

