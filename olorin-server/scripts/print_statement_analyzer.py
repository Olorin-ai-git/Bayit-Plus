#!/usr/bin/env python3
"""
Print Statement Analysis Tool for Unified Logging Migration

This script analyzes all print statements in the codebase and categorizes them
for systematic migration to the unified logging system.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import os
import re
import ast
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict
import argparse


class PrintStatementAnalyzer:
    """Analyzes print statements across the codebase for migration planning"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.print_inventory = defaultdict(list)
        self.file_stats = defaultdict(int)
        self.categories = {
            'debug': [],
            'info': [],
            'warning': [], 
            'error': [],
            'test_output': [],
            'example_demo': [],
            'development': []
        }
        
    def analyze_codebase(self) -> Dict:
        """Analyze all Python files for print statements"""
        print("🔍 Analyzing print statements across codebase...")
        
        python_files = list(self.base_path.rglob("*.py"))
        excluded_patterns = [
            '__pycache__',
            '.pytest_cache',
            'venv',
            '.venv',
            'node_modules',
        ]
        
        # Filter out excluded paths
        python_files = [
            f for f in python_files 
            if not any(pattern in str(f) for pattern in excluded_patterns)
        ]
        
        total_files = len(python_files)
        files_with_prints = 0
        total_prints = 0
        
        for i, file_path in enumerate(python_files, 1):
            if i % 50 == 0:
                print(f"  Progress: {i}/{total_files} files analyzed...")
                
            try:
                prints_in_file = self._analyze_file(file_path)
                if prints_in_file:
                    files_with_prints += 1
                    self.file_stats[str(file_path.relative_to(self.base_path))] = len(prints_in_file)
                    total_prints += len(prints_in_file)
                    
            except Exception as e:
                print(f"  ⚠️ Error analyzing {file_path}: {e}")
                
        print(f"✅ Analysis complete:")
        print(f"  Total Python files: {total_files}")
        print(f"  Files with print statements: {files_with_prints}")
        print(f"  Total print statements: {total_prints}")
        
        return {
            'total_files': total_files,
            'files_with_prints': files_with_prints,
            'total_prints': total_prints,
            'file_stats': dict(self.file_stats),
            'categories': self.categories,
            'print_inventory': dict(self.print_inventory)
        }
    
    def _analyze_file(self, file_path: Path) -> List[Dict]:
        """Analyze a single file for print statements"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse AST to find print statements
            tree = ast.parse(content)
            prints_found = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if (isinstance(node.func, ast.Name) and node.func.id == 'print'):
                        print_info = self._analyze_print_statement(node, content, file_path)
                        if print_info:
                            prints_found.append(print_info)
                            self._categorize_print(print_info, file_path)
                            
            if prints_found:
                rel_path = str(file_path.relative_to(self.base_path))
                self.print_inventory[rel_path] = prints_found
                
            return prints_found
            
        except Exception as e:
            # Fallback to regex if AST parsing fails
            return self._fallback_regex_analysis(file_path, content if 'content' in locals() else None)
    
    def _analyze_print_statement(self, node: ast.Call, content: str, file_path: Path) -> Dict:
        """Analyze individual print statement"""
        lines = content.split('\n')
        line_no = node.lineno
        
        if line_no <= len(lines):
            line_content = lines[line_no - 1].strip()
            
            # Extract print arguments
            args = []
            for arg in node.args:
                if isinstance(arg, ast.Constant):
                    args.append(arg.value)
                elif isinstance(arg, ast.Str):  # Python < 3.8 compatibility
                    args.append(arg.s)
                else:
                    args.append('<complex_expression>')
            
            return {
                'line_no': line_no,
                'line_content': line_content,
                'args': args,
                'file_path': str(file_path.relative_to(self.base_path)),
                'context': self._determine_context(file_path, line_content, args)
            }
        return None
    
    def _fallback_regex_analysis(self, file_path: Path, content: str = None) -> List[Dict]:
        """Fallback regex analysis when AST parsing fails"""
        if content is None:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                return []
                
        prints_found = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            if 'print(' in line:
                print_info = {
                    'line_no': i,
                    'line_content': line.strip(),
                    'args': ['<regex_parsed>'],
                    'file_path': str(file_path.relative_to(self.base_path)),
                    'context': self._determine_context(file_path, line, ['<regex_parsed>'])
                }
                prints_found.append(print_info)
                self._categorize_print(print_info, file_path)
                
        return prints_found
    
    def _determine_context(self, file_path: Path, line_content: str, args: List) -> str:
        """Determine the context/purpose of the print statement"""
        path_str = str(file_path).lower()
        line_lower = line_content.lower()
        args_str = ' '.join(str(arg) for arg in args).lower()
        
        # Test files
        if 'test' in path_str or 'test_' in path_str:
            return 'test_output'
        
        # Example/demo files
        if 'example' in path_str or 'demo' in path_str:
            return 'example_demo'
        
        # Debug prints
        if any(keyword in line_lower or keyword in args_str for keyword in [
            'debug', 'debugging', 'dbg', 'trace', 'inspect'
        ]):
            return 'debug'
        
        # Error prints
        if any(keyword in line_lower or keyword in args_str for keyword in [
            'error', 'exception', 'fail', 'traceback', 'err'
        ]):
            return 'error'
        
        # Warning prints
        if any(keyword in line_lower or keyword in args_str for keyword in [
            'warning', 'warn', 'caution', 'alert'
        ]):
            return 'warning'
        
        # Info/status prints
        if any(keyword in line_lower or keyword in args_str for keyword in [
            'info', 'status', 'result', 'success', 'complete', 'finished'
        ]):
            return 'info'
        
        # Development/temporary prints
        if any(keyword in line_lower or keyword in args_str for keyword in [
            'todo', 'fixme', 'temp', 'tmp', 'hack'
        ]):
            return 'development'
        
        return 'info'  # Default category
    
    def _categorize_print(self, print_info: Dict, file_path: Path):
        """Categorize print statement for migration planning"""
        context = print_info['context']
        self.categories[context].append({
            'file': print_info['file_path'],
            'line': print_info['line_no'],
            'content': print_info['line_content']
        })
    
    def generate_migration_plan(self, analysis_result: Dict) -> Dict:
        """Generate migration plan based on analysis"""
        migration_plan = {
            'phase_3_overview': {
                'total_prints': analysis_result['total_prints'],
                'migration_priority': 'critical → high → medium → low',
                'estimated_duration': '2-3 weeks'
            },
            'priority_levels': {
                'critical': {
                    'categories': ['error'],
                    'count': len(self.categories['error']),
                    'migration_method': 'logger.error()',
                    'timeline': 'Week 1'
                },
                'high': {
                    'categories': ['warning', 'debug'],
                    'count': len(self.categories['warning']) + len(self.categories['debug']),
                    'migration_method': 'logger.warning() / logger.debug()',
                    'timeline': 'Week 1-2'
                },
                'medium': {
                    'categories': ['info'],
                    'count': len(self.categories['info']),
                    'migration_method': 'logger.info()',
                    'timeline': 'Week 2'
                },
                'low': {
                    'categories': ['test_output', 'example_demo', 'development'],
                    'count': (len(self.categories['test_output']) + 
                             len(self.categories['example_demo']) +
                             len(self.categories['development'])),
                    'migration_method': 'Conditional logging / Remove',
                    'timeline': 'Week 3'
                }
            },
            'top_files_by_prints': sorted(
                analysis_result['file_stats'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:20]
        }
        
        return migration_plan
    
    def save_analysis(self, analysis_result: Dict, migration_plan: Dict, output_file: str = None):
        """Save analysis results to JSON file"""
        if output_file is None:
            output_file = "print_statement_analysis.json"
            
        output_data = {
            'analysis_timestamp': '2025-01-04',
            'analysis_result': analysis_result,
            'migration_plan': migration_plan,
            'unified_logging_plan': '/docs/plans/2025-01-04-unified-logging-system-plan.md'
        }
        
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)
            
        print(f"📄 Analysis saved to: {output_file}")
    
    def print_summary(self, migration_plan: Dict):
        """Print analysis summary"""
        print("\n" + "="*70)
        print("📊 PRINT STATEMENT MIGRATION ANALYSIS SUMMARY")
        print("="*70)
        
        overview = migration_plan['phase_3_overview']
        print(f"Total print statements found: {overview['total_prints']}")
        print(f"Estimated migration duration: {overview['estimated_duration']}")
        print(f"Migration priority: {overview['migration_priority']}")
        
        print(f"\n🎯 PRIORITY BREAKDOWN:")
        for priority, details in migration_plan['priority_levels'].items():
            print(f"  {priority.upper()}: {details['count']} prints")
            print(f"    Categories: {', '.join(details['categories'])}")
            print(f"    Method: {details['migration_method']}")
            print(f"    Timeline: {details['timeline']}")
        
        print(f"\n📁 TOP 10 FILES BY PRINT COUNT:")
        for file_path, count in migration_plan['top_files_by_prints'][:10]:
            print(f"  {file_path}: {count} prints")
        
        print("\n" + "="*70)


def main():
    parser = argparse.ArgumentParser(description='Analyze print statements for unified logging migration')
    parser.add_argument('--base-path', default='.', help='Base path to analyze (default: current directory)')
    parser.add_argument('--output', default='print_statement_analysis.json', help='Output file for analysis results')
    parser.add_argument('--summary-only', action='store_true', help='Show only summary, no detailed analysis')
    
    args = parser.parse_args()
    
    analyzer = PrintStatementAnalyzer(args.base_path)
    
    if args.summary_only:
        # Quick count for summary
        python_files = list(Path(args.base_path).rglob("*.py"))
        python_files = [f for f in python_files if '__pycache__' not in str(f)]
        total_prints = 0
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    total_prints += content.count('print(')
            except:
                continue
                
        print(f"Quick analysis: {total_prints} print statements found in {len(python_files)} Python files")
        return
    
    # Full analysis
    analysis_result = analyzer.analyze_codebase()
    migration_plan = analyzer.generate_migration_plan(analysis_result)
    
    analyzer.print_summary(migration_plan)
    analyzer.save_analysis(analysis_result, migration_plan, args.output)


if __name__ == "__main__":
    main()