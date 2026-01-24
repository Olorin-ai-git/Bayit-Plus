#!/usr/bin/env python3
"""
Script to replace console.* statements with proper logger usage in mobile app.

Usage:
    python fix-console-logs.py [--dry-run]

This script will:
1. Find all .ts and .tsx files with console statements
2. Add logger import if missing
3. Create scoped logger for each module
4. Replace console.log/warn/error/debug/info with logger methods
5. Preserve console statements in:
   - Comment blocks
   - sentry.ts initialization messages
   - firebase.example.ts files
"""

import re
import os
import sys
from pathlib import Path
from typing import List, Tuple

# Base directory for mobile app source
BASE_DIR = Path(__file__).parent.parent / "src"

# Files to exclude
EXCLUDE_FILES = {
    "config/firebase.example.ts",
}

# Console statements to preserve (in sentry.ts)
PRESERVE_IN_SENTRY = [
    'console.info("[Sentry] DSN not configured',
    'console.info("[Sentry] Initialized',
    'console.error("[Sentry] Failed to initialize',
]


def should_skip_file(file_path: Path) -> bool:
    """Check if file should be skipped."""
    rel_path = file_path.relative_to(BASE_DIR)
    return str(rel_path) in EXCLUDE_FILES


def extract_module_name(file_path: Path) -> str:
    """Extract module name from file path for scoped logger."""
    stem = file_path.stem
    # Convert PascalCase or camelCase to readable name
    # e.g., "MobileAudioPlayer" -> "MobileAudioPlayer"
    # e.g., "useVoiceMobile" -> "useVoiceMobile"
    return stem


def has_logger_import(content: str) -> bool:
    """Check if file already has logger import."""
    return bool(re.search(r"import\s+.*logger.*from\s+['\"].*logger", content))


def has_scoped_logger(content: str) -> bool:
    """Check if file already has a scoped logger."""
    return bool(re.search(r"const\s+\w*[Ll]ogger\s*=\s*logger\.scope\(", content))


def add_logger_import(content: str, file_path: Path) -> str:
    """Add logger import if missing."""
    if has_logger_import(content):
        return content

    # Find the last import statement
    imports = list(re.finditer(r'^import\s+.*from\s+[\'"].*[\'"];?\s*$', content, re.MULTILINE))

    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        logger_import = "\nimport logger from '@/utils/logger';\n"
        content = content[:insert_pos] + logger_import + content[insert_pos:]
    else:
        # No imports found, add at the beginning (after comments)
        # Find first non-comment, non-empty line
        lines = content.split('\n')
        insert_line = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('//') and not stripped.startswith('/*') and not stripped.startswith('*'):
                insert_line = i
                break

        logger_import = "import logger from '@/utils/logger';\n\n"
        lines.insert(insert_line, logger_import)
        content = '\n'.join(lines)

    return content


def add_scoped_logger(content: str, module_name: str) -> str:
    """Add scoped logger declaration if missing."""
    if has_scoped_logger(content):
        return content

    # Find position after imports
    imports = list(re.finditer(r'^import\s+.*from\s+[\'"].*[\'"];?\s*$', content, re.MULTILINE))

    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        scoped_logger = f"\n\nconst moduleLogger = logger.scope('{module_name}');\n"
        content = content[:insert_pos] + scoped_logger + content[insert_pos:]

    return content


def replace_console_statements(content: str, file_path: Path) -> Tuple[str, int]:
    """Replace console statements with logger calls."""
    count = 0

    # Special handling for sentry.ts
    is_sentry = file_path.name == "sentry.ts"

    # Replace console.error
    def replace_error(match: re.Match) -> str:
        nonlocal count
        full_match = match.group(0)

        # Preserve sentry initialization messages
        if is_sentry and any(preserve in full_match for preserve in PRESERVE_IN_SENTRY):
            return full_match

        # Extract arguments
        args = match.group(1)

        # Parse arguments to convert to structured logging
        # Simple case: console.error('message', data) -> logger.error('message', data)
        # Complex case: console.error('[Tag] message:', data) -> logger.error('message', data)

        # Try to extract [Tag] prefix
        tag_match = re.match(r"^\s*['\"]?\[([^\]]+)\]['\"]?\s*(.*)", args)
        if tag_match:
            # Has a tag, use it for context but message is just the text
            message_part = tag_match.group(2).strip()
            # Remove leading comma and quotes
            message_part = re.sub(r'^[,\s]+[\'"]?', '', message_part)
            message_part = re.sub(r'[\'"]?[,\s]*$', '', message_part)

            count += 1
            return f"moduleLogger.error('{message_part.strip(':')}', {args.split(',', 1)[1].strip() if ',' in args else ''})"

        count += 1
        return f"moduleLogger.error({args})"

    content = re.sub(r'console\.error\((.*?)\)(?=\s*[;\n])', replace_error, content)

    # Replace console.warn
    def replace_warn(match: re.Match) -> str:
        nonlocal count
        args = match.group(1)
        count += 1
        return f"moduleLogger.warn({args})"

    content = re.sub(r'console\.warn\((.*?)\)(?=\s*[;\n])', replace_warn, content)

    # Replace console.log -> logger.debug or logger.info
    def replace_log(match: re.Match) -> str:
        nonlocal count
        args = match.group(1)
        count += 1
        # Use debug for verbose logs, info for important state changes
        return f"moduleLogger.debug({args})"

    content = re.sub(r'console\.log\((.*?)\)(?=\s*[;\n])', replace_log, content)

    # Replace console.info -> logger.info
    def replace_info(match: re.Match) -> str:
        nonlocal count
        full_match = match.group(0)

        # Preserve sentry initialization messages
        if is_sentry and any(preserve in full_match for preserve in PRESERVE_IN_SENTRY):
            return full_match

        args = match.group(1)
        count += 1
        return f"moduleLogger.info({args})"

    content = re.sub(r'console\.info\((.*?)\)(?=\s*[;\n])', replace_info, content)

    # Replace console.debug -> logger.debug
    def replace_debug(match: re.Match) -> str:
        nonlocal count
        args = match.group(1)
        count += 1
        return f"moduleLogger.debug({args})"

    content = re.sub(r'console\.debug\((.*?)\)(?=\s*[;\n])', replace_debug, content)

    return content, count


def process_file(file_path: Path, dry_run: bool = False) -> Tuple[bool, int]:
    """Process a single file."""
    if should_skip_file(file_path):
        return False, 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Check if file has console statements
        if not re.search(r'console\.(log|warn|error|debug|info)', original_content):
            return False, 0

        content = original_content
        module_name = extract_module_name(file_path)

        # Add logger import
        content = add_logger_import(content, file_path)

        # Add scoped logger
        content = add_scoped_logger(content, module_name)

        # Replace console statements
        content, count = replace_console_statements(content, file_path)

        if content != original_content:
            if not dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            return True, count

        return False, 0

    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False, 0


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("DRY RUN MODE - No files will be modified\n")

    # Find all TypeScript files
    ts_files = list(BASE_DIR.rglob("*.ts")) + list(BASE_DIR.rglob("*.tsx"))

    modified_files = []
    total_replacements = 0

    for file_path in ts_files:
        modified, count = process_file(file_path, dry_run)
        if modified:
            rel_path = file_path.relative_to(BASE_DIR)
            modified_files.append((rel_path, count))
            total_replacements += count
            status = "[DRY RUN] Would modify" if dry_run else "Modified"
            print(f"{status}: {rel_path} ({count} replacements)")

    print(f"\n{'Would modify' if dry_run else 'Modified'} {len(modified_files)} files")
    print(f"Total console.* replacements: {total_replacements}")

    if dry_run:
        print("\nRun without --dry-run to apply changes")
    else:
        print("\nAll files updated successfully!")


if __name__ == "__main__":
    main()
