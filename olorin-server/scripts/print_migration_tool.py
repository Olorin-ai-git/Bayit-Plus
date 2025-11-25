#!/usr/bin/env python3
"""
Print Statement Migration Tool for Unified Logging System

This tool systematically migrates print statements to use the unified logging system
while preserving functionality and improving log management.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import argparse
import ast
import json
import os
import re
import shutil
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class MigrationRule:
    """Defines how to migrate a specific type of print statement"""

    pattern: str
    replacement_template: str
    log_level: str
    requires_logger_import: bool = True
    requires_unified_logger_import: bool = False
    condition: Optional[str] = None


class PrintMigrationTool:
    """Tool for migrating print statements to unified logging"""

    def __init__(self, analysis_file: str = "print_analysis_results.json"):
        self.analysis_file = analysis_file
        self.analysis_data = {}
        self.migration_rules = self._define_migration_rules()
        self.migration_stats = defaultdict(int)
        self.errors = []
        self.backup_dir = Path("migration_backups")

    def _define_migration_rules(self) -> List[MigrationRule]:
        """Define migration rules for different print statement patterns"""
        return [
            # Error patterns
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Ee]rror.*["\']',
                replacement_template='logger.error("{message}")',
                log_level="error",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Ff]ail.*["\']',
                replacement_template='logger.error("{message}")',
                log_level="error",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Ee]xception.*["\']',
                replacement_template='logger.error("{message}")',
                log_level="error",
                requires_unified_logger_import=True,
            ),
            # Warning patterns
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Ww]arn.*["\']',
                replacement_template='logger.warning("{message}")',
                log_level="warning",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Cc]aution.*["\']',
                replacement_template='logger.warning("{message}")',
                log_level="warning",
                requires_unified_logger_import=True,
            ),
            # Debug patterns
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Dd]ebug.*["\']',
                replacement_template='logger.debug("{message}")',
                log_level="debug",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Tt]race.*["\']',
                replacement_template='logger.debug("{message}")',
                log_level="debug",
                requires_unified_logger_import=True,
            ),
            # Info patterns (default)
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Ss]uccess.*["\']',
                replacement_template='logger.info("{message}")',
                log_level="info",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Cc]omplete.*["\']',
                replacement_template='logger.info("{message}")',
                log_level="info",
                requires_unified_logger_import=True,
            ),
            # Test patterns (conditional logging)
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*[Tt]est.*["\']',
                replacement_template='logger.debug("{message}")',
                log_level="debug",
                requires_unified_logger_import=True,
                condition="if logger.isEnabledFor(logging.DEBUG)",
            ),
            # Generic patterns
            MigrationRule(
                pattern=r'print\s*\(\s*f["\'].*["\'].*\)',
                replacement_template='logger.info(f"{message}")',
                log_level="info",
                requires_unified_logger_import=True,
            ),
            MigrationRule(
                pattern=r'print\s*\(\s*["\'].*["\'].*\)',
                replacement_template='logger.info("{message}")',
                log_level="info",
                requires_unified_logger_import=True,
            ),
            # Complex expressions
            MigrationRule(
                pattern=r"print\s*\(\s*.*\s*\)",
                replacement_template="logger.info({message})",
                log_level="info",
                requires_unified_logger_import=True,
            ),
        ]

    def load_analysis(self):
        """Load print statement analysis results"""
        try:
            with open(self.analysis_file, "r") as f:
                self.analysis_data = json.load(f)
            print(f"📄 Loaded analysis from {self.analysis_file}")
        except FileNotFoundError:
            print(f"⚠️ Analysis file not found: {self.analysis_file}")
            print("Run the analyzer first: python scripts/print_statement_analyzer.py")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing analysis file: {e}")
            return False
        return True

    def create_backup(self, file_path: Path):
        """Create backup of file before migration"""
        self.backup_dir.mkdir(exist_ok=True)
        backup_path = self.backup_dir / file_path.name
        counter = 1

        while backup_path.exists():
            backup_path = (
                self.backup_dir / f"{file_path.stem}_{counter}{file_path.suffix}"
            )
            counter += 1

        shutil.copy2(file_path, backup_path)
        return backup_path

    def migrate_file(self, file_path: Path, dry_run: bool = True) -> Dict:
        """Migrate print statements in a single file"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                original_content = f.read()

        except Exception as e:
            error = f"Error reading {file_path}: {e}"
            self.errors.append(error)
            return {"success": False, "error": error}

        # Create backup if not dry run
        backup_path = None
        if not dry_run:
            backup_path = self.create_backup(file_path)

        # Perform migration
        migrated_content, migration_info = self._migrate_content(
            original_content, file_path
        )

        # Write migrated content if not dry run
        if not dry_run and migrated_content != original_content:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(migrated_content)
            except Exception as e:
                error = f"Error writing migrated {file_path}: {e}"
                self.errors.append(error)
                return {"success": False, "error": error}

        return {
            "success": True,
            "file_path": str(file_path),
            "backup_path": str(backup_path) if backup_path else None,
            "migrations_made": migration_info["count"],
            "migration_details": migration_info["details"],
            "requires_imports": migration_info["requires_imports"],
            "content_changed": migrated_content != original_content,
        }

    def _migrate_content(self, content: str, file_path: Path) -> Tuple[str, Dict]:
        """Migrate print statements in content"""
        lines = content.split("\n")
        migrated_lines = []
        migration_details = []
        requires_imports = set()
        migration_count = 0

        for line_no, line in enumerate(lines, 1):
            if "print(" in line:
                migrated_line, migration_info = self._migrate_line(
                    line, line_no, file_path
                )
                if migration_info:
                    migration_details.append(migration_info)
                    requires_imports.update(migration_info.get("imports", []))
                    migration_count += 1
                migrated_lines.append(migrated_line)
            else:
                migrated_lines.append(line)

        # Add necessary imports at the top
        migrated_content = "\n".join(migrated_lines)
        if requires_imports and migration_count > 0:
            migrated_content = self._add_imports(migrated_content, requires_imports)

        return migrated_content, {
            "count": migration_count,
            "details": migration_details,
            "requires_imports": list(requires_imports),
        }

    def _migrate_line(
        self, line: str, line_no: int, file_path: Path
    ) -> Tuple[str, Optional[Dict]]:
        """Migrate a single line containing a print statement"""
        original_line = line

        # Skip certain patterns that shouldn't be migrated
        if self._should_skip_line(line, file_path):
            return line, None

        # Try each migration rule
        for rule in self.migration_rules:
            match = re.search(rule.pattern, line, re.IGNORECASE)
            if match:
                migrated_line = self._apply_migration_rule(line, rule, match)

                migration_info = {
                    "line_no": line_no,
                    "original": original_line.strip(),
                    "migrated": migrated_line.strip(),
                    "log_level": rule.log_level,
                    "rule_pattern": rule.pattern,
                    "imports": [],
                }

                if rule.requires_unified_logger_import:
                    migration_info["imports"].append("unified_logger")
                elif rule.requires_logger_import:
                    migration_info["imports"].append("standard_logger")

                return migrated_line, migration_info

        # If no rule matched, use default migration
        return self._default_migration(line, line_no)

    def _should_skip_line(self, line: str, file_path: Path) -> bool:
        """Determine if a line should be skipped during migration"""
        path_str = str(file_path).lower()
        line_lower = line.lower()

        # Skip lines in specific contexts
        skip_patterns = [
            # Already migrated
            "logger." in line_lower,
            # Special print usages
            "print(" in line and ("sys.stdout" in line or "file=" in line),
            # Commented out prints
            line.strip().startswith("#"),
            # Complex formatting that needs manual review
            "print(" in line
            and ("join(" in line or "format(" in line)
            and len(line) > 120,
        ]

        return any(skip_patterns)

    def _apply_migration_rule(
        self, line: str, rule: MigrationRule, match: re.Match
    ) -> str:
        """Apply a migration rule to transform the line"""
        # Extract indentation
        indent = len(line) - len(line.lstrip())
        prefix = line[:indent]

        # Extract the print statement content
        print_content = self._extract_print_content(line)

        # Generate the replacement
        if "{message}" in rule.replacement_template:
            replacement = rule.replacement_template.replace("{message}", print_content)
        else:
            replacement = rule.replacement_template

        # Add condition if specified
        if rule.condition:
            return f"{prefix}{rule.condition}:\n{prefix}    {replacement}"
        else:
            return f"{prefix}{replacement}"

    def _extract_print_content(self, line: str) -> str:
        """Extract the content from a print statement"""
        # Find the print statement and extract its arguments
        match = re.search(r"print\s*\(\s*(.*)\s*\)", line, re.DOTALL)
        if match:
            content = match.group(1).strip()

            # Remove trailing commas and clean up
            content = content.rstrip(",").strip()

            # If empty, return empty string
            if not content:
                return '""'

            # Handle various string formats
            if content.startswith('f"') and content.endswith('"'):
                return content
            elif content.startswith("f'") and content.endswith("'"):
                return content
            elif content.startswith('"') and content.endswith('"'):
                return content
            elif content.startswith("'") and content.endswith("'"):
                return content
            elif content.startswith('f"') or content.startswith("f'"):
                # f-string but possibly malformed - keep as is
                return content
            elif (content.startswith('"') and not content.endswith('"')) or (
                content.startswith("'") and not content.endswith("'")
            ):
                # Malformed string - wrap safely
                return f"str({content})"
            else:
                # Complex expression or variable
                return content
        return '""'

    def _default_migration(self, line: str, line_no: int) -> Tuple[str, Optional[Dict]]:
        """Default migration for unmatched print statements"""
        indent = len(line) - len(line.lstrip())
        prefix = line[:indent]
        content = self._extract_print_content(line)

        migrated_line = f"{prefix}logger.info({content})"

        migration_info = {
            "line_no": line_no,
            "original": line.strip(),
            "migrated": migrated_line.strip(),
            "log_level": "info",
            "rule_pattern": "default",
            "imports": ["unified_logger"],
        }

        return migrated_line, migration_info

    def _add_imports(self, content: str, required_imports: Set[str]) -> str:
        """Add necessary imports to the file"""
        lines = content.split("\n")

        # Find the best place to insert imports
        import_insert_index = 0

        # Look for existing imports
        for i, line in enumerate(lines):
            if line.strip().startswith(("import ", "from ")):
                import_insert_index = i + 1
            elif line.strip() and not line.strip().startswith("#"):
                break

        # Generate import statements
        imports_to_add = []

        if "unified_logger" in required_imports:
            imports_to_add.append("from app.service.logging import get_bridge_logger")
            imports_to_add.append("logger = get_bridge_logger(__name__)")
            imports_to_add.append("")  # Empty line for spacing
        elif "standard_logger" in required_imports:
            imports_to_add.append("import logging")
            imports_to_add.append("logger = logging.getLogger(__name__)")
            imports_to_add.append("")  # Empty line for spacing

        # Insert imports
        if imports_to_add:
            lines[import_insert_index:import_insert_index] = imports_to_add

        return "\n".join(lines)

    def migrate_by_priority(self, priority: str, dry_run: bool = True) -> Dict:
        """Migrate print statements by priority level"""
        if not self.analysis_data:
            return {"success": False, "error": "No analysis data loaded"}

        migration_plan = self.analysis_data.get("migration_plan", {})
        priority_info = migration_plan.get("priority_levels", {}).get(priority, {})

        if not priority_info:
            return {"success": False, "error": f'Priority level "{priority}" not found'}

        categories = priority_info["categories"]
        files_to_migrate = set()

        # Collect files from specified categories
        analysis_categories = self.analysis_data.get("analysis_result", {}).get(
            "categories", {}
        )
        for category in categories:
            if category in analysis_categories:
                for item in analysis_categories[category]:
                    files_to_migrate.add(item["file"])

        print(f"🔄 Migrating {priority} priority print statements...")
        print(f"Categories: {', '.join(categories)}")
        print(f"Files to process: {len(files_to_migrate)}")

        results = {
            "success": True,
            "priority": priority,
            "categories": categories,
            "total_files": len(files_to_migrate),
            "file_results": [],
            "summary": defaultdict(int),
        }

        # Process each file
        for file_path_str in files_to_migrate:
            file_path = Path(file_path_str)
            if file_path.exists():
                result = self.migrate_file(file_path, dry_run)
                results["file_results"].append(result)

                if result["success"]:
                    results["summary"]["files_processed"] += 1
                    results["summary"]["migrations_made"] += result["migrations_made"]
                    if result["content_changed"]:
                        results["summary"]["files_modified"] += 1
                else:
                    results["summary"]["files_failed"] += 1
            else:
                results["summary"]["files_not_found"] += 1

        return results

    def generate_migration_report(self, results: Dict) -> str:
        """Generate a comprehensive migration report"""
        report = []
        report.append("=" * 70)
        report.append("📊 PRINT STATEMENT MIGRATION REPORT")
        report.append("=" * 70)

        report.append(f"Priority Level: {results['priority'].upper()}")
        report.append(f"Categories: {', '.join(results['categories'])}")
        report.append(f"Files Processed: {results['summary']['files_processed']}")
        report.append(f"Files Modified: {results['summary']['files_modified']}")
        report.append(f"Total Migrations: {results['summary']['migrations_made']}")

        if results["summary"]["files_failed"] > 0:
            report.append(f"Files Failed: {results['summary']['files_failed']}")

        if results["summary"]["files_not_found"] > 0:
            report.append(f"Files Not Found: {results['summary']['files_not_found']}")

        report.append("")
        report.append("📁 DETAILED FILE RESULTS:")

        for file_result in results["file_results"]:
            if file_result["success"] and file_result["content_changed"]:
                report.append(
                    f"  ✅ {file_result['file_path']}: {file_result['migrations_made']} migrations"
                )

                for detail in file_result["migration_details"][:3]:  # Show first 3
                    report.append(
                        f"    Line {detail['line_no']}: {detail['log_level']}"
                    )
                    report.append(f"      - {detail['original']}")
                    report.append(f"      + {detail['migrated']}")

                if len(file_result["migration_details"]) > 3:
                    remaining = len(file_result["migration_details"]) - 3
                    report.append(f"    ... and {remaining} more migrations")
                report.append("")
            elif not file_result["success"]:
                report.append(
                    f"  ❌ {file_result['file_path']}: {file_result.get('error', 'Unknown error')}"
                )

        report.append("=" * 70)

        return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(
        description="Migrate print statements to unified logging"
    )
    parser.add_argument(
        "--analysis-file",
        default="print_analysis_results.json",
        help="Analysis results file",
    )
    parser.add_argument(
        "--priority",
        choices=["critical", "high", "medium", "low"],
        help="Priority level to migrate",
    )
    parser.add_argument("--file", help="Migrate specific file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Perform dry run without modifying files (default)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually perform the migration (overrides dry-run)",
    )
    parser.add_argument("--output-report", help="Save migration report to file")

    args = parser.parse_args()

    # Override dry_run if execute is specified
    dry_run = args.dry_run and not args.execute

    tool = PrintMigrationTool(args.analysis_file)

    if not tool.load_analysis():
        return 1

    if args.file:
        # Migrate single file
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"❌ File not found: {args.file}")
            return 1

        result = tool.migrate_file(file_path, dry_run)
        print(f"Migration result: {result}")

    elif args.priority:
        # Migrate by priority
        results = tool.migrate_by_priority(args.priority, dry_run)

        if results["success"] is False:
            print(f"❌ Migration failed: {results['error']}")
            return 1

        # Generate and display report
        report = tool.generate_migration_report(results)
        print(report)

        if args.output_report:
            with open(args.output_report, "w") as f:
                f.write(report)
            print(f"📄 Report saved to: {args.output_report}")

    else:
        print("❌ Must specify either --priority or --file")
        return 1

    if dry_run:
        print("\n🔍 This was a DRY RUN - no files were modified")
        print("Use --execute to perform actual migration")
    else:
        print("\n✅ Migration completed")
        print("Backup files created in migration_backups/ directory")

    return 0


if __name__ == "__main__":
    exit(main())
