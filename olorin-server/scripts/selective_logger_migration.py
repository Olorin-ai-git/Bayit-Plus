#!/usr/bin/env python3
"""
Selective Logger Migration for Core Files

This tool migrates only the most critical core files to unified logging,
focusing on middleware, service layer, and router files.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import re
from pathlib import Path
from typing import List, Dict
import argparse


class SelectiveLoggerMigration:
    """Tool for migrating core loggers to unified logging"""
    
    def __init__(self):
        # Focus on core infrastructure files
        self.priority_patterns = [
            'app/middleware/*.py',
            'app/service/*.py',
            'app/router/*.py', 
            'app/security/*.py',
            'app/utils/*.py',
        ]
        self.exclude_patterns = [
            'test',
            'example', 
            'demo',
            'backup',
            '__pycache__'
        ]
        
    def find_priority_logger_files(self) -> List[Path]:
        """Find priority files for logger migration"""
        logger_files = []
        
        for pattern in self.priority_patterns:
            for file_path in Path('.').glob(pattern):
                if self._should_migrate_file(file_path):
                    logger_files.append(file_path)
        
        return sorted(logger_files)
    
    def _should_migrate_file(self, file_path: Path) -> bool:
        """Check if file should be migrated"""
        # Skip excluded patterns
        if any(exclude in str(file_path) for exclude in self.exclude_patterns):
            return False
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                return 'logging.getLogger(__name__)' in content
        except:
            return False
    
    def migrate_logger_in_file(self, file_path: Path, dry_run: bool = True) -> Dict:
        """Migrate logger in a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {'success': False, 'error': str(e), 'file': str(file_path)}
        
        # Check if already migrated
        if 'get_bridge_logger' in content:
            return {
                'success': True,
                'file': str(file_path),
                'already_migrated': True,
                'changes': []
            }
        
        original_content = content
        changes = []
        
        # Replace logging import and initialization
        if 'import logging' in content and 'logging.getLogger(__name__)' in content:
            # Add unified logging import after existing logging import
            content = re.sub(
                r'^import logging$',
                'import logging\nfrom app.service.logging import get_bridge_logger',
                content,
                flags=re.MULTILINE
            )
            changes.append('Added unified logging import')
            
            # Replace logger initialization
            content = re.sub(
                r'logger = logging\.getLogger\(__name__\)',
                'logger = get_bridge_logger(__name__)',
                content
            )
            changes.append('Updated logger initialization to use unified logging')
        
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
    
    def migrate_priority_loggers(self, dry_run: bool = True) -> Dict:
        """Migrate priority logger files"""
        files = self.find_priority_logger_files()
        
        print(f"🎯 Found {len(files)} priority files with specialized loggers")
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
                    print(f"  ✅ {file_path}: already migrated")
                elif result['content_changed']:
                    results['migrated_files'] += 1
                    changes_desc = ', '.join(result['changes'])
                    print(f"  ✅ {file_path}: {changes_desc}")
                else:
                    print(f"  ⏭️ {file_path}: no changes needed")
            else:
                print(f"  ❌ {file_path}: {result['error']}")
        
        return results


def main():
    parser = argparse.ArgumentParser(description='Migrate priority loggers to unified logging')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Perform dry run (default)')
    parser.add_argument('--execute', action='store_true',
                       help='Actually perform migration')
    parser.add_argument('--list-files', action='store_true',
                       help='List priority files that would be processed')
    
    args = parser.parse_args()
    
    dry_run = args.dry_run and not args.execute
    
    tool = SelectiveLoggerMigration()
    
    if args.list_files:
        files = tool.find_priority_logger_files()
        print(f"📁 Found {len(files)} priority files with specialized loggers:")
        for file_path in files:
            print(f"  {file_path}")
        return 0
    
    results = tool.migrate_priority_loggers(dry_run)
    
    print(f"\n📊 MIGRATION SUMMARY:")
    print(f"  Files processed: {results['total_files']}")
    print(f"  Files migrated: {results['migrated_files']}")
    print(f"  Already migrated: {results['already_migrated']}")
    
    if dry_run:
        print(f"\n🔍 This was a DRY RUN - use --execute to perform actual migration")
    else:
        print(f"\n✅ Priority logger migration completed successfully")
    
    return 0


if __name__ == "__main__":
    exit(main())