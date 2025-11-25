from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Selective Print Migration for Project Files Only

This script focuses on migrating print statements only in actual project source files,
excluding external libraries, generated files, and test frameworks.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Set


class SelectiveMigrationTool:
    """Tool for selectively migrating project print statements"""

    def __init__(self):
        self.project_patterns = ["app/**/*.py", "scripts/**/*.py", "*.py"]
        self.exclude_patterns = [
            ".tox/**",
            "__pycache__/**",
            ".pytest_cache/**",
            "venv/**",
            ".venv/**",
            "node_modules/**",
            "build/**",
            "dist/**",
            "test/**",
            "tests/**",
            # Exclude test files
            "**/test_*.py",
            "**/*_test.py",
            "**/conftest.py",
            # Exclude specific files that shouldn't be modified
            "scripts/print_statement_analyzer.py",
            "scripts/print_migration_tool.py",
        ]

    def get_project_files_with_prints(self) -> List[Path]:
        """Get list of project files containing print statements"""
        project_files = []

        # Find all Python files in project patterns
        for pattern in self.project_patterns:
            files = list(Path(".").glob(pattern))
            for file_path in files:
                if self._should_include_file(file_path):
                    if self._file_has_prints(file_path):
                        project_files.append(file_path)

        return sorted(project_files)

    def _should_include_file(self, file_path: Path) -> bool:
        """Check if file should be included in migration"""
        path_str = str(file_path)

        # Check exclusion patterns
        for exclude in self.exclude_patterns:
            if file_path.match(exclude):
                return False

        # Only include .py files
        if not path_str.endswith(".py"):
            return False

        return True

    def _file_has_prints(self, file_path: Path) -> bool:
        """Check if file contains print statements"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return "print(" in content
        except:
            return False

    def migrate_file(self, file_path: Path, dry_run: bool = True) -> Dict:
        """Migrate print statements in a file with better parsing"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            return {"success": False, "error": str(e), "file": str(file_path)}

        migrated_lines = []
        migrations = []
        needs_logger_import = False

        for i, line in enumerate(lines):
            original_line = line

            if "logger.info(" in line and not line.strip().startswith("#"):
                # Simple, safe migration
                migrated_line = self._migrate_print_line(line, i + 1)
                migrated_lines.append(migrated_line)

                if migrated_line != original_line:
                    migrations.append(
                        {
                            "line_no": i + 1,
                            "original": original_line.strip(),
                            "migrated": migrated_line.strip(),
                        }
                    )
                    needs_logger_import = True
            else:
                migrated_lines.append(line)

        # Add logger import if needed
        if needs_logger_import:
            migrated_lines = self._add_logger_import(migrated_lines)

        migrated_content = "".join(migrated_lines)

        # Write file if not dry run
        if not dry_run and migrations:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(migrated_content)
            except Exception as e:
                return {"success": False, "error": str(e), "file": str(file_path)}

        return {
            "success": True,
            "file": str(file_path),
            "migrations_count": len(migrations),
            "migrations": migrations,
            "needs_logger_import": needs_logger_import,
        }

    def _migrate_print_line(self, line: str, line_no: int) -> str:
        """Migrate a single print statement line"""
        # Preserve indentation
        indent = len(line) - len(line.lstrip())
        prefix = line[:indent]

        # Simple patterns for safe migration
        patterns = [
            # Error patterns
            (
                r'print\s*\(\s*([f]?["\'][^"\']*[Ee]rror[^"\']*["\'].*?)\)',
                r"logger.error(\1)",
            ),
            (
                r'print\s*\(\s*([f]?["\'][^"\']*[Ff]ail[^"\']*["\'].*?)\)',
                r"logger.error(\1)",
            ),
            (
                r'print\s*\(\s*([f]?["\'][^"\']*[Ee]xception[^"\']*["\'].*?)\)',
                r"logger.error(\1)",
            ),
            # Warning patterns
            (
                r'print\s*\(\s*([f]?["\'][^"\']*[Ww]arn[^"\']*["\'].*?)\)',
                r"logger.warning(\1)",
            ),
            # Debug patterns
            (
                r'print\s*\(\s*([f]?["\'][^"\']*[Dd]ebug[^"\']*["\'].*?)\)',
                r"logger.debug(\1)",
            ),
            # Default to info
            (r"print\s*\((.*?)\)", r"logger.info(\1)"),
        ]

        modified_line = line
        for pattern, replacement in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                modified_line = re.sub(pattern, replacement, line, flags=re.IGNORECASE)
                break

        return modified_line

    def _add_logger_import(self, lines: List[str]) -> List[str]:
        """Add logger import to file"""
        # Find best place to add import
        import_index = 0
        for i, line in enumerate(lines):
            if line.strip().startswith(("import ", "from ")):
                import_index = i + 1
            elif line.strip() and not line.strip().startswith("#"):
                break

        # Insert logger import
        logger_import = "from app.service.logging import get_bridge_logger\nlogger = get_bridge_logger(__name__)\n\n"
        lines.insert(import_index, logger_import)

        return lines

    def migrate_all_project_files(self, dry_run: bool = True) -> Dict:
        """Migrate all project files"""
        files = self.get_project_files_with_prints()

        logger.info(f"🎯 Found {len(files)} project files with print statements")
        if dry_run:
            logger.info("🔍 Running in DRY RUN mode - no files will be modified")

        results = {
            "total_files": len(files),
            "migrated_files": 0,
            "total_migrations": 0,
            "files": [],
        }

        for file_path in files:
            result = self.migrate_file(file_path, dry_run)
            results["files"].append(result)

            if result["success"]:
                if result["migrations_count"] > 0:
                    results["migrated_files"] += 1
                    results["total_migrations"] += result["migrations_count"]

                    logger.info(
                        f"  ✅ {file_path}: {result['migrations_count']} migrations"
                    )
                else:
                    logger.info(f"  ⏭️ {file_path}: no migrations needed")
            else:
                logger.info(f"  ❌ {file_path}: {result['error']}")

        return results


def main():
    parser = argparse.ArgumentParser(
        description="Selective migration of project print statements"
    )
    parser.add_argument(
        "--dry-run", action="store_true", default=True, help="Perform dry run (default)"
    )
    parser.add_argument(
        "--execute", action="store_true", help="Actually perform migration"
    )
    parser.add_argument(
        "--list-files",
        action="store_true",
        help="Just list files that would be processed",
    )

    args = parser.parse_args()

    dry_run = args.dry_run and not args.execute

    tool = SelectiveMigrationTool()

    if args.list_files:
        files = tool.get_project_files_with_prints()
        logger.info(f"📁 Found {len(files)} project files with print statements:")
        for file_path in files:
            logger.info(f"  {file_path}")
        return 0

    results = tool.migrate_all_project_files(dry_run)

    logger.info(f"\n📊 MIGRATION SUMMARY:")
    logger.info(f"  Files processed: {results['total_files']}")
    logger.info(f"  Files migrated: {results['migrated_files']}")
    logger.info(f"  Total migrations: {results['total_migrations']}")

    if dry_run:
        logger.info(
            f"\n🔍 This was a DRY RUN - use --execute to perform actual migration"
        )
    else:
        logger.info(f"\n✅ Migration completed successfully")

    return 0


if __name__ == "__main__":
    exit(main())
