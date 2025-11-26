#!/usr/bin/env python3
"""
Logger Migration Tool for Specialized Loggers

This tool updates existing specialized loggers to use the unified logging system
while maintaining their specialized functionality.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple
import argparse


class LoggerMigrationTool:
    """Tool for migrating specialized loggers to unified logging"""
    
    def __init__(self):
        self.target_files = [
            'app/middleware/production_error_middleware.py',
            'app/middleware/performance_middleware.py', 
            'app/security/encryption.py',
            'app/service/performance.py',
            'app/service/performance_integration.py'
        ]
        
    def find_logger_files(self) -> List[Path]:
        """Find files using logging.getLogger that should be migrated"""
        logger_files = []
        
        # Find all Python files that use logging.getLogger
        for pattern in ['app/**/*.py', 'scripts/**/*.py']:
            for file_path in Path('.').glob(pattern):
                if self._should_migrate_file(file_path):
                    logger_files.append(file_path)
        
        return logger_files
    
    def _should_migrate_file(self, file_path: Path) -> bool:
        """Check if file should have its logger migrated"""
        # Skip test files and examples
        skip_patterns = [
            'test', 'example', 'demo', '__pycache__',
            'migration', 'analyzer', 'selective_migration'
        ]
        
        if any(pattern in str(file_path) for pattern in skip_patterns):
            return False
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                return 'logging.getLogger(__name__)' in content
        except:
            return False
    
    def migrate_logger_in_file(self, file_path: Path, dry_run: bool = True) -> Dict:
        """Migrate logger import and initialization in a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {'success': False, 'error': str(e), 'file': str(file_path)}
        
        original_content = content
        
        # Check if already using unified logging
        if 'get_bridge_logger' in content:
            return {
                'success': True,
                'file': str(file_path),
                'already_migrated': True,
                'changes': []
            }
        
        changes = []
        
        # Replace logging import with unified logging import
        if 'import logging' in content and 'logging.getLogger(__name__)' in content:
            # Add unified logging import
            logging_import_pattern = r'^import logging$'
            replacement = 'import logging\nfrom app.service.logging import get_bridge_logger'
            
            content = re.sub(logging_import_pattern, replacement, content, flags=re.MULTILINE)
            changes.append('Added unified logging import')
            
            # Replace logger initialization
            logger_pattern = r'logger = logging\.getLogger\(__name__\)'
            logger_replacement = 'logger = get_bridge_logger(__name__)'
            
            content = re.sub(logger_pattern, logger_replacement, content)
            changes.append('Replaced logger initialization with unified logger')
        
        # Check for structured logging opportunities
        if self._has_structured_logging_opportunities(content):
            changes.append('File has structured logging opportunities (manual review needed)')
        
        # Write file if changes were made and not dry run
        if content != original_content and not dry_run:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            except Exception as e:
                return {'success': False, 'error': str(e), 'file': str(file_path)}
        
        return {
            'success': True,
            'file': str(file_path),
            'already_migrated': False,
            'changes': changes,
            'content_changed': content != original_content
        }
    
    def _has_structured_logging_opportunities(self, content: str) -> bool:
        """Check if file has opportunities for structured logging"""
        patterns = [
            r'logger\.(info|debug|warning|error)\(.*f["\'][^"\']*\{[^}]+\}',  # f-strings
            r'extra\s*=\s*\{',  # Already using extra parameter
            r'\.format\(',  # String formatting
        ]
        
        return any(re.search(pattern, content) for pattern in patterns)
    
    def migrate_all_loggers(self, dry_run: bool = True) -> Dict:
        """Migrate all eligible logger files"""
        files = self.find_logger_files()
        
        print(f"🎯 Found {len(files)} files with specialized loggers")
        if dry_run:
            print("🔍 Running in DRY RUN mode - no files will be modified")
        
        results = {
            'total_files': len(files),
            'migrated_files': 0,
            'already_migrated': 0,
            'files': []
        }
        
        for file_path in files:
            result = self.migrate_logger_in_file(file_path, dry_run)
            results['files'].append(result)
            
            if result['success']:
                if result.get('already_migrated'):
                    results['already_migrated'] += 1
                    print(f"  ✅ {file_path}: already using unified logging")
                elif result['content_changed']:
                    results['migrated_files'] += 1
                    changes = ', '.join(result['changes'])
                    print(f"  ✅ {file_path}: {changes}")
                else:
                    print(f"  ⏭️ {file_path}: no changes needed")
            else:
                print(f"  ❌ {file_path}: {result['error']}")
        
        return results


def main():
    parser = argparse.ArgumentParser(description='Migrate specialized loggers to unified logging')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Perform dry run (default)')
    parser.add_argument('--execute', action='store_true',
                       help='Actually perform migration')
    parser.add_argument('--list-files', action='store_true',
                       help='List files that would be processed')
    
    args = parser.parse_args()
    
    dry_run = args.dry_run and not args.execute
    
    tool = LoggerMigrationTool()
    
    if args.list_files:
        files = tool.find_logger_files()
        print(f"📁 Found {len(files)} files with specialized loggers:")
        for file_path in files:
            print(f"  {file_path}")
        return 0
    
    results = tool.migrate_all_loggers(dry_run)
    
    print(f"\n📊 MIGRATION SUMMARY:")
    print(f"  Files processed: {results['total_files']}")
    print(f"  Files migrated: {results['migrated_files']}")
    print(f"  Already migrated: {results['already_migrated']}")
    
    if dry_run:
        print(f"\n🔍 This was a DRY RUN - use --execute to perform actual migration")
    else:
        print(f"\n✅ Logger migration completed successfully")
    
    return 0


if __name__ == "__main__":
    exit(main())