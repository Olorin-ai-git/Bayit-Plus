#!/usr/bin/env python3
"""
Refactor script to rename 'structured' to 'structured' throughout the codebase.
This script performs case-preserving replacements while maintaining word boundaries.
"""

import os
import re
import shutil
from pathlib import Path
from typing import List, Tuple

# Base directory
BASE_DIR = Path("/Users/gklainert/Documents/olorin/olorin-server")

# Directories to exclude
EXCLUDE_DIRS = {
    "__pycache__",
    ".git",
    ".pytest_cache",
    "node_modules",
    ".venv",
    "venv",
    "logs",
    ".mypy_cache",
    ".tox",
    "dist",
    "build",
    "*.egg-info"
}

# File extensions to process for content replacement
PROCESS_EXTENSIONS = {".py", ".md", ".txt", ".json", ".yaml", ".yml", ".html", ".sh"}


def should_process_path(path: Path) -> bool:
    """Check if path should be processed (not in excluded directories)."""
    path_parts = set(path.parts)
    return not any(excl in path_parts for excl in EXCLUDE_DIRS)


def case_preserving_replace(text: str, old_word: str, new_word: str) -> str:
    """
    Replace old_word with new_word while preserving case patterns.
    Handles: lowercase, UPPERCASE, Titlecase, and mixed contexts.
    """
    def replace_match(match):
        original = match.group(0)
        if original.isupper():
            return new_word.upper()
        elif original[0].isupper():
            return new_word.capitalize()
        else:
            return new_word.lower()

    # Simple case-insensitive replacement
    # This will catch all variations of the word
    pattern = re.compile(re.escape(old_word), re.IGNORECASE)
    return pattern.sub(replace_match, text)


def find_files_to_rename() -> List[Path]:
    """Find all files with 'structured' in their filename."""
    files_to_rename = []
    for root, dirs, files in os.walk(BASE_DIR):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        root_path = Path(root)
        if not should_process_path(root_path):
            continue

        for filename in files:
            if 'structured' in filename.lower():
                file_path = root_path / filename
                files_to_rename.append(file_path)

    return files_to_rename


def find_files_with_content() -> List[Path]:
    """Find all files containing 'structured' in their content."""
    files_with_content = []
    for root, dirs, files in os.walk(BASE_DIR):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        root_path = Path(root)
        if not should_process_path(root_path):
            continue

        for filename in files:
            file_path = root_path / filename

            # Only process certain file types
            if file_path.suffix not in PROCESS_EXTENSIONS:
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if re.search(r'\bstructured\b', content, re.IGNORECASE):
                        files_with_content.append(file_path)
            except (UnicodeDecodeError, PermissionError):
                # Skip binary files or files we can't read
                continue

    return files_with_content


def rename_files(files: List[Path], dry_run: bool = False) -> List[Tuple[Path, Path]]:
    """Rename files containing 'structured' to 'structured'."""
    renamed_files = []

    for old_path in files:
        # Create new filename
        old_name = old_path.name
        new_name = case_preserving_replace(old_name, 'structured', 'structured')
        new_path = old_path.parent / new_name

        if dry_run:
            print(f"[DRY RUN] Would rename:")
            print(f"  FROM: {old_path}")
            print(f"  TO:   {new_path}")
        else:
            print(f"Renaming:")
            print(f"  FROM: {old_path}")
            print(f"  TO:   {new_path}")
            shutil.move(str(old_path), str(new_path))

        renamed_files.append((old_path, new_path))

    return renamed_files


def update_file_contents(files: List[Path], dry_run: bool = False) -> int:
    """Update file contents to replace 'structured' with 'structured'."""
    updated_count = 0

    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()

            # Perform case-preserving replacement
            new_content = case_preserving_replace(original_content, 'structured', 'structured')

            if original_content != new_content:
                if dry_run:
                    print(f"[DRY RUN] Would update: {file_path}")
                else:
                    print(f"Updating: {file_path}")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                updated_count += 1

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    return updated_count


def main():
    """Main refactoring function."""
    import sys

    # Check for --execute flag
    execute_mode = '--execute' in sys.argv

    print("=" * 80)
    print("REFACTORING: structured → structured")
    print("=" * 80)
    print()

    # DRY RUN FIRST
    print("Phase 1: Finding files to rename...")
    files_to_rename = find_files_to_rename()
    print(f"Found {len(files_to_rename)} files with 'structured' in filename")
    print()

    print("Phase 2: Finding files with 'structured' in content...")
    files_with_content = find_files_with_content()
    print(f"Found {len(files_with_content)} files with 'structured' in content")
    print()

    # Show what would be done
    print("=" * 80)
    if execute_mode:
        print("EXECUTING REFACTORING")
    else:
        print("DRY RUN - Showing what would be changed")
        print("(Run with --execute flag to actually perform changes)")
    print("=" * 80)
    print()

    if files_to_rename:
        print("FILES TO RENAME:")
        rename_files(files_to_rename, dry_run=not execute_mode)
        print()

    if files_with_content:
        print("FILES TO UPDATE CONTENT:")
        for f in files_with_content[:10]:  # Show first 10
            print(f"  - {f}")
        if len(files_with_content) > 10:
            print(f"  ... and {len(files_with_content) - 10} more files")
        print()

    if not execute_mode:
        print("This was a DRY RUN. No changes were made.")
        print("Run with --execute flag to perform actual refactoring.")
        return

    print()
    print("=" * 80)
    print("EXECUTING CHANGES")
    print("=" * 80)
    print()

    # Step 1: Update file contents FIRST (before renaming files)
    print("Step 1: Updating file contents...")
    updated_count = update_file_contents(files_with_content, dry_run=False)
    print(f"Updated {updated_count} files")
    print()

    # Step 2: Rename files AFTER updating contents
    print("Step 2: Renaming files...")
    renamed_files = rename_files(files_to_rename, dry_run=False)
    print(f"Renamed {len(renamed_files)} files")
    print()

    # Step 3: Update imports in renamed files
    print("Step 3: Updating imports in renamed files...")
    # Re-scan files with new names
    new_files_with_content = find_files_with_content()
    updated_count = update_file_contents(new_files_with_content, dry_run=False)
    print(f"Updated {updated_count} files with import changes")
    print()

    print("=" * 80)
    print("REFACTORING COMPLETE")
    print("=" * 80)
    print()
    print("Summary:")
    print(f"  - Renamed {len(renamed_files)} files")
    print(f"  - Updated content in {len(files_with_content)} files")
    print()
    print("Next steps:")
    print("  1. Review changes with: git diff")
    print("  2. Run tests: poetry run pytest")
    print("  3. Commit changes: git add . && git commit -m 'refactor: rename structured to structured'")


if __name__ == "__main__":
    main()
