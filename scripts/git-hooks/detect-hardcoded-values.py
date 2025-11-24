#!/usr/bin/env python3
"""
Pre-commit hook to detect hardcoded values in code.

Constitutional Compliance:
- Detects hardcoded numeric values, strings, and configuration
- Reports violations with file paths and line numbers
- Excludes test files and legitimate hardcoded values
"""

import sys
import os
import re
from pathlib import Path


# Patterns for hardcoded values to detect
HARDCODED_PATTERNS = [
    # Hardcoded numeric thresholds (e.g., 3.5, 50, 100)
    (r'\b(3\.5|50|100|200|500|1000|2000|5000|10000)\b', 'Hardcoded numeric threshold'),
    
    # Hardcoded time values (e.g., 15, 30, 60, 300, 3600)
    (r'\b(15|30|60|300|3600|86400)\b', 'Hardcoded time value'),
    
    # Hardcoded URLs
    (r'https?://[^\s\'"]+', 'Hardcoded URL'),
    
    # Hardcoded API keys or tokens (basic pattern)
    (r'(api[_-]?key|token|secret|password)\s*[:=]\s*[\'"][^\'"]+[\'"]', 'Potential hardcoded credential'),
    
    # Hardcoded database connection strings
    (r'(postgresql|mysql|mongodb)://[^\s\'"]+', 'Hardcoded database connection'),
]


# Excluded patterns (legitimate uses)
EXCLUDED_PATTERNS = [
    r'\.get\(.*\)',  # Dictionary.get() calls (likely config)
    r'os\.getenv',   # Environment variable access
    r'os\.environ',  # Environment variable access
    r'process\.env', # Node.js environment variable
    r'config\.',     # Config object access
    r'\.env',        # Environment file
    r'test_',        # Test files
    r'/test/',       # Test directories
    r'#.*',          # Comments
    r'"""',          # Docstrings
    r"'''",          # Docstrings
    r'logger\.',     # Logger calls
    r'print\(',      # Print statements
    r'console\.',    # Console logs
]


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
    
    # Only check source files
    if not (file_path.endswith('.py') or file_path.endswith('.ts') or 
            file_path.endswith('.tsx') or file_path.endswith('.js') or
            file_path.endswith('.jsx')):
        return False
    
    return True


def is_excluded_line(line: str) -> bool:
    """
    Check if a line should be excluded from hardcoded value detection.

    Args:
        line: Line of code to check

    Returns:
        True if line should be excluded, False otherwise
    """
    for pattern in EXCLUDED_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return True
    return False


def check_file_for_hardcoded_values(file_path: str) -> list[tuple[int, str, str]]:
    """
    Check a file for hardcoded values.

    Args:
        file_path: Path to the file

    Returns:
        List of tuples (line_number, pattern_description, matched_text)
    """
    violations = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, start=1):
                if is_excluded_line(line):
                    continue
                
                for pattern, description in HARDCODED_PATTERNS:
                    matches = re.finditer(pattern, line, re.IGNORECASE)
                    for match in matches:
                        # Check if match is in a string literal (more likely to be hardcoded)
                        before_match = line[:match.start()]
                        string_quotes = before_match.count('"') + before_match.count("'")
                        if string_quotes % 2 == 1:  # Inside a string
                            violations.append((line_num, description, match.group()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
    
    return violations


def main():
    """Main entry point for the hook."""
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
        
        file_violations = check_file_for_hardcoded_values(file_path)
        if file_violations:
            violations.append((file_path, file_violations))
    
    # Report violations
    if violations:
        print(f"\n❌ Hardcoded values detected:\n", file=sys.stderr)
        for file_path, file_violations in violations:
            print(f"  {file_path}:", file=sys.stderr)
            for line_num, description, matched_text in file_violations:
                print(f"    Line {line_num}: {description} - '{matched_text}'", file=sys.stderr)
        print(f"\nPlease replace hardcoded values with configuration from environment variables.", file=sys.stderr)
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

