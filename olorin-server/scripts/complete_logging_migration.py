#!/usr/bin/env python3
"""
Complete Logging Migration Tool for Olorin Server

This tool systematically migrates ALL old logging mechanisms in the codebase
to the unified logging system using get_bridge_logger(__name__).

Author: Gil Klainert  
Date: 2025-01-04
Related: Unified Logging System Phase 2 Implementation

Usage:
    # Dry run (default) - shows what will be changed without modification
    python scripts/complete_logging_migration.py
    
    # Execute the migration
    python scripts/complete_logging_migration.py --execute
    
    # Verbose output with detailed analysis
    python scripts/complete_logging_migration.py --execute --verbose
    
    # Target specific directory (default is app/)
    python scripts/complete_logging_migration.py --execute --target-dir app/service/
"""

import argparse
import os
import re
import shutil
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import sys


@dataclass
class LoggingPattern:
    """Represents a logging pattern found in a file."""
    file_path: Path
    line_number: int
    original_text: str
    pattern_type: str  # 'import' or 'logger_init'
    library: str  # 'logging' or 'structlog'


@dataclass
class MigrationResult:
    """Results of migrating a single file."""
    file_path: Path
    patterns_found: List[LoggingPattern]
    was_migrated: bool
    backup_created: bool
    error: Optional[str] = None


@dataclass 
class MigrationSummary:
    """Summary of the entire migration process."""
    total_files_scanned: int
    total_files_with_patterns: int  
    total_files_migrated: int
    total_patterns_replaced: int
    files_with_errors: List[str]
    files_already_unified: List[str]
    execution_time: float


class LoggingMigrationTool:
    """Main migration tool class."""
    
    # Regex patterns for finding old logging usage
    IMPORT_PATTERNS = {
        'logging_standalone': re.compile(r'^import logging$', re.MULTILINE),
        'logging_from': re.compile(r'^from logging import (.+)$', re.MULTILINE),
        'structlog_standalone': re.compile(r'^import structlog$', re.MULTILINE), 
        'structlog_from': re.compile(r'^from structlog import (.+)$', re.MULTILINE),
    }
    
    LOGGER_INIT_PATTERNS = {
        'logging_getlogger': re.compile(r'logger\s*=\s*logging\.getLogger\(__name__\)'),
        'structlog_getlogger': re.compile(r'logger\s*=\s*structlog\.get_logger\(__name__\)'),
    }
    
    # Files/directories to exclude from scanning
    EXCLUDE_PATTERNS = {
        '__pycache__',
        '.pytest_cache', 
        '.mypy_cache',
        '.tox',
        'node_modules',
        'test',  # Exclude test directory
        'tests',
        '.git',
        'venv',
        'env',
        'build',
        'dist'
    }
    
    # Files that should not be migrated (already using unified logging)
    ALREADY_UNIFIED_INDICATORS = [
        'get_bridge_logger',
        'from app.service.logging import get_bridge_logger',
        'from .logging import get_bridge_logger'
    ]
    
    def __init__(self, target_dir: str = "app", dry_run: bool = True, verbose: bool = False):
        """Initialize the migration tool."""
        self.target_dir = Path(target_dir)
        self.dry_run = dry_run
        self.verbose = verbose
        self.results: List[MigrationResult] = []
        self.start_time = datetime.now()
        
        if not self.target_dir.exists():
            raise ValueError(f"Target directory '{target_dir}' does not exist")
            
    def _log(self, message: str, level: str = "INFO"):
        """Internal logging for the tool."""
        if level == "DEBUG" and not self.verbose:
            return
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = f"[{timestamp}] [{level}]"
        print(f"{prefix} {message}")
        
    def _should_exclude_file(self, file_path: Path) -> bool:
        """Check if a file should be excluded from processing."""
        # Check if any part of the path contains excluded patterns
        for part in file_path.parts:
            if part in self.EXCLUDE_PATTERNS:
                return True
                
        # Exclude non-Python files
        if file_path.suffix != '.py':
            return True
            
        return False
        
    def _is_already_using_unified_logging(self, content: str) -> bool:
        """Check if file already uses unified logging."""
        return any(indicator in content for indicator in self.ALREADY_UNIFIED_INDICATORS)
        
    def _find_python_files(self) -> List[Path]:
        """Find all Python files in the target directory."""
        python_files = []
        
        for root, dirs, files in os.walk(self.target_dir):
            # Remove excluded directories from traversal
            dirs[:] = [d for d in dirs if d not in self.EXCLUDE_PATTERNS]
            
            for file in files:
                file_path = Path(root) / file
                if not self._should_exclude_file(file_path):
                    python_files.append(file_path)
                    
        return sorted(python_files)
        
    def _find_logging_patterns(self, content: str, file_path: Path) -> List[LoggingPattern]:
        """Find all logging patterns in file content."""
        patterns = []
        lines = content.split('\n')
        
        # Find import patterns
        for pattern_name, regex in self.IMPORT_PATTERNS.items():
            for match in regex.finditer(content):
                line_num = content[:match.start()].count('\n') + 1
                library = 'logging' if 'logging' in pattern_name else 'structlog'
                
                pattern = LoggingPattern(
                    file_path=file_path,
                    line_number=line_num,
                    original_text=match.group(0),
                    pattern_type='import',
                    library=library
                )
                patterns.append(pattern)
                
        # Find logger initialization patterns  
        for pattern_name, regex in self.LOGGER_INIT_PATTERNS.items():
            for match in regex.finditer(content):
                line_num = content[:match.start()].count('\n') + 1
                library = 'logging' if 'logging' in pattern_name else 'structlog'
                
                pattern = LoggingPattern(
                    file_path=file_path,
                    line_number=line_num,
                    original_text=match.group(0),
                    pattern_type='logger_init',
                    library=library
                )
                patterns.append(pattern)
                
        return patterns
        
    def _has_other_logging_usage(self, content: str) -> Dict[str, bool]:
        """Check if file uses logging/structlog for purposes other than basic logger creation."""
        # Remove logger initialization lines for analysis
        temp_content = content
        for regex in self.LOGGER_INIT_PATTERNS.values():
            temp_content = regex.sub('', temp_content)
            
        # Check for other logging usage patterns
        logging_usage = {
            'has_logging_constants': bool(re.search(r'logging\.(DEBUG|INFO|WARNING|ERROR|CRITICAL)', temp_content)),
            'has_logging_handlers': bool(re.search(r'logging\.(StreamHandler|FileHandler|Handler)', temp_content)),
            'has_logging_config': bool(re.search(r'logging\.(basicConfig|config|dictConfig)', temp_content)),
            'has_structlog_config': bool(re.search(r'structlog\.(configure|get_config)', temp_content)),
            'has_other_logging_calls': bool(re.search(r'logging\.(?!getLogger)', temp_content)),
            'has_other_structlog_calls': bool(re.search(r'structlog\.(?!get_logger)', temp_content)),
        }
        
        return logging_usage
        
    def _migrate_file_content(self, content: str, patterns: List[LoggingPattern]) -> str:
        """Migrate file content by replacing old patterns with unified logging."""
        new_content = content
        
        # Track what imports we need to add/remove
        needs_bridge_import = False
        imports_to_remove = set()
        
        # Process patterns in reverse order to preserve line numbers
        for pattern in sorted(patterns, key=lambda p: p.line_number, reverse=True):
            if pattern.pattern_type == 'logger_init':
                # Replace logger initialization
                new_content = new_content.replace(
                    pattern.original_text,
                    'logger = get_bridge_logger(__name__)'
                )
                needs_bridge_import = True
                
            elif pattern.pattern_type == 'import':
                # Check if this import is only used for basic logger creation
                usage = self._has_other_logging_usage(content)
                
                # Only remove standalone imports if they're not used elsewhere
                if (pattern.original_text == 'import logging' and 
                    not any([usage['has_logging_constants'], usage['has_logging_handlers'], 
                           usage['has_logging_config'], usage['has_other_logging_calls']])):
                    imports_to_remove.add(pattern.original_text)
                    
                elif (pattern.original_text == 'import structlog' and 
                      not any([usage['has_structlog_config'], usage['has_other_structlog_calls']])):
                    imports_to_remove.add(pattern.original_text)
                    
        # Remove standalone imports that are no longer needed
        for import_to_remove in imports_to_remove:
            new_content = new_content.replace(f"{import_to_remove}\n", "")
            
        # Add unified logging import if needed
        if needs_bridge_import and 'from app.service.logging import get_bridge_logger' not in new_content:
            # Find a good place to add the import (after existing imports)
            lines = new_content.split('\n')
            import_insert_index = 0
            last_import_found = False
            
            # Find the last import line or first non-comment/docstring line
            in_docstring = False
            docstring_char = None
            
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                # Handle docstrings
                if not in_docstring and (stripped.startswith('"""') or stripped.startswith("'''")):
                    docstring_char = stripped[:3]
                    if stripped.count(docstring_char) == 1:  # Opening docstring
                        in_docstring = True
                    continue
                elif in_docstring and docstring_char in stripped:
                    in_docstring = False
                    continue
                elif in_docstring:
                    continue
                    
                # Skip empty lines and comments
                if not stripped or stripped.startswith('#'):
                    continue
                    
                # Track import lines
                if (stripped.startswith('import ') or 
                    (stripped.startswith('from ') and ' import ' in stripped)):
                    import_insert_index = i + 1
                    last_import_found = True
                elif stripped and not stripped.startswith(('import ', 'from ')):
                    # First non-import line found
                    if not last_import_found:
                        # No imports found yet, insert before this line
                        import_insert_index = i
                    break
                    
            # Insert the unified logging import with proper spacing
            unified_import = "from app.service.logging import get_bridge_logger"
            
            # Add a blank line after the import if we're inserting after other imports
            if last_import_found and import_insert_index < len(lines) and lines[import_insert_index].strip():
                lines.insert(import_insert_index, unified_import)
                lines.insert(import_insert_index + 1, "")
            else:
                lines.insert(import_insert_index, unified_import)
                
            new_content = '\n'.join(lines)
            
        return new_content
        
    def _create_backup(self, file_path: Path) -> bool:
        """Create a backup of the file before modification."""
        if self.dry_run:
            return False
            
        backup_path = file_path.with_suffix(f"{file_path.suffix}.backup")
        try:
            shutil.copy2(file_path, backup_path)
            self._log(f"Created backup: {backup_path}", "DEBUG")
            return True
        except Exception as e:
            self._log(f"Failed to create backup for {file_path}: {e}", "ERROR")
            return False
            
    def _migrate_file(self, file_path: Path) -> MigrationResult:
        """Migrate a single file."""
        self._log(f"Processing file: {file_path}", "DEBUG")
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check if already using unified logging
            if self._is_already_using_unified_logging(content):
                self._log(f"File already uses unified logging: {file_path}", "DEBUG")
                return MigrationResult(
                    file_path=file_path,
                    patterns_found=[],
                    was_migrated=False,
                    backup_created=False
                )
                
            # Find logging patterns
            patterns = self._find_logging_patterns(content, file_path)
            
            if not patterns:
                self._log(f"No logging patterns found in: {file_path}", "DEBUG")
                return MigrationResult(
                    file_path=file_path,
                    patterns_found=[],
                    was_migrated=False,
                    backup_created=False
                )
                
            self._log(f"Found {len(patterns)} logging patterns in: {file_path}")
            
            if self.verbose:
                for pattern in patterns:
                    self._log(f"  Line {pattern.line_number}: {pattern.original_text} ({pattern.pattern_type})", "DEBUG")
                    
            # Don't migrate in dry-run mode
            if self.dry_run:
                return MigrationResult(
                    file_path=file_path,
                    patterns_found=patterns,
                    was_migrated=False,
                    backup_created=False
                )
                
            # Create backup
            backup_created = self._create_backup(file_path)
            
            # Migrate content
            new_content = self._migrate_file_content(content, patterns)
            
            # Write migrated content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            self._log(f"Successfully migrated: {file_path}")
            
            return MigrationResult(
                file_path=file_path,
                patterns_found=patterns,
                was_migrated=True,
                backup_created=backup_created
            )
            
        except Exception as e:
            error_msg = f"Error processing {file_path}: {str(e)}"
            self._log(error_msg, "ERROR")
            return MigrationResult(
                file_path=file_path,
                patterns_found=[],
                was_migrated=False,
                backup_created=False,
                error=error_msg
            )
            
    def run_migration(self) -> MigrationSummary:
        """Run the complete migration process."""
        self._log("Starting logging migration process...")
        self._log(f"Target directory: {self.target_dir}")
        self._log(f"Dry run mode: {self.dry_run}")
        
        # Find all Python files
        python_files = self._find_python_files()
        self._log(f"Found {len(python_files)} Python files to scan")
        
        # Process each file
        files_with_patterns = 0
        files_migrated = 0
        total_patterns = 0
        files_with_errors = []
        files_already_unified = []
        
        for file_path in python_files:
            result = self._migrate_file(file_path)
            self.results.append(result)
            
            if result.error:
                files_with_errors.append(str(result.file_path))
            elif not result.patterns_found and self._is_already_using_unified_logging(
                open(result.file_path, 'r').read()
            ):
                files_already_unified.append(str(result.file_path))
            elif result.patterns_found:
                files_with_patterns += 1
                total_patterns += len(result.patterns_found)
                if result.was_migrated:
                    files_migrated += 1
                    
        # Calculate summary
        end_time = datetime.now()
        execution_time = (end_time - self.start_time).total_seconds()
        
        summary = MigrationSummary(
            total_files_scanned=len(python_files),
            total_files_with_patterns=files_with_patterns,
            total_files_migrated=files_migrated,
            total_patterns_replaced=total_patterns,
            files_with_errors=files_with_errors,
            files_already_unified=files_already_unified,
            execution_time=execution_time
        )
        
        self._print_summary(summary)
        return summary
        
    def _print_summary(self, summary: MigrationSummary):
        """Print migration summary report."""
        print("\n" + "="*80)
        print("LOGGING MIGRATION SUMMARY")
        print("="*80)
        
        print(f"Mode: {'DRY RUN' if self.dry_run else 'EXECUTION'}")
        print(f"Target Directory: {self.target_dir}")
        print(f"Execution Time: {summary.execution_time:.2f} seconds")
        print()
        
        print("STATISTICS:")
        print(f"  Total files scanned: {summary.total_files_scanned}")
        print(f"  Files with old logging patterns: {summary.total_files_with_patterns}")
        print(f"  Files already using unified logging: {len(summary.files_already_unified)}")
        print(f"  Files migrated: {summary.total_files_migrated}")
        print(f"  Total patterns replaced: {summary.total_patterns_replaced}")
        print(f"  Files with errors: {len(summary.files_with_errors)}")
        print()
        
        if summary.files_with_errors:
            print("FILES WITH ERRORS:")
            for file_path in summary.files_with_errors:
                print(f"  - {file_path}")
            print()
            
        if self.verbose and summary.files_already_unified:
            print("FILES ALREADY USING UNIFIED LOGGING:")
            for file_path in summary.files_already_unified[:10]:  # Show first 10
                print(f"  - {file_path}")
            if len(summary.files_already_unified) > 10:
                print(f"  ... and {len(summary.files_already_unified) - 10} more")
            print()
            
        # Show sample of changes made
        if not self.dry_run and summary.total_files_migrated > 0:
            print("SAMPLE CHANGES MADE:")
            shown = 0
            for result in self.results:
                if result.was_migrated and shown < 5:
                    print(f"  {result.file_path}:")
                    for pattern in result.patterns_found[:3]:  # Show first 3 patterns
                        print(f"    Line {pattern.line_number}: '{pattern.original_text}' -> unified logging")
                    if len(result.patterns_found) > 3:
                        print(f"    ... and {len(result.patterns_found) - 3} more patterns")
                    shown += 1
            print()
            
        if self.dry_run:
            print("NOTE: This was a dry run. No files were modified.")
            print("Use --execute to perform the actual migration.")
        else:
            print("Migration completed successfully!")
            if summary.total_files_migrated > 0:
                print("IMPORTANT: Test your application to ensure all functionality works correctly.")
                print("Backup files have been created with .backup extension.")
                
        print("="*80)


def main():
    """Main entry point for the migration tool."""
    parser = argparse.ArgumentParser(
        description="Complete Logging Migration Tool for Olorin Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would be changed
  python scripts/complete_logging_migration.py
  
  # Execute the migration
  python scripts/complete_logging_migration.py --execute
  
  # Verbose output with detailed analysis
  python scripts/complete_logging_migration.py --execute --verbose
  
  # Target specific directory
  python scripts/complete_logging_migration.py --execute --target-dir app/service/
        """
    )
    
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute the migration (default is dry-run mode)'
    )
    
    parser.add_argument(
        '--target-dir',
        type=str,
        default='app',
        help='Target directory to migrate (default: app)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true', 
        help='Enable verbose output with detailed analysis'
    )
    
    args = parser.parse_args()
    
    try:
        # Create and run migration tool
        tool = LoggingMigrationTool(
            target_dir=args.target_dir,
            dry_run=not args.execute,
            verbose=args.verbose
        )
        
        summary = tool.run_migration()
        
        # Exit with appropriate code
        if summary.files_with_errors:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        print(f"FATAL ERROR: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()