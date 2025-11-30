#!/usr/bin/env python3
"""
KillDups: Code Duplication Detector & Strategy Generator
=======================================================
Scans the codebase for:
1. Exact file duplicates (MD5)
2. Structural logic duplication in Python (AST)

Generates a strategic refactoring plan.
"""

import os
import sys
import ast
import hashlib
from pathlib import Path
from collections import defaultdict
from typing import Dict, List

# Configuration
IGNORE_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env', 
    'dist', 'build', 'coverage', '.pytest_cache', 'migrations',
    'artifacts', 'logs', '.idea', '.vscode'
}
IGNORE_EXTENSIONS = {'.pyc', '.pyo', '.pyd', '.so', '.dll', '.class', '.o', '.obj', '.exe', '.DS_Store'}
# Focus on source code
TARGET_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.java', '.c', '.cpp', '.h', '.sh'}

class DuplicationDetector:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.file_hashes: Dict[str, List[Path]] = defaultdict(list)
        self.code_block_hashes: Dict[str, List[Dict]] = defaultdict(list)
        self.scanned_files = 0

    def scan(self):
        print(f"🔍 Scanning codebase at {self.root_dir}...")
        for root, dirs, files in os.walk(self.root_dir):
            # Filter directories in place
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in TARGET_EXTENSIONS:
                    self._process_file(file_path)
        
        print(f"✅ Scanned {self.scanned_files} files.")
        self._generate_report()

    def _process_file(self, file_path: Path):
        self.scanned_files += 1
        try:
            # Read as bytes for hash, string for AST
            content_bytes = file_path.read_bytes()
            
            # 1. Exact File Duplication
            file_hash = hashlib.md5(content_bytes).hexdigest()
            self.file_hashes[file_hash].append(file_path)
            
            # 2. Function/Class Duplication (Python only)
            if file_path.suffix == '.py':
                try:
                    content_str = content_bytes.decode('utf-8')
                    self._analyze_python_ast(content_str, file_path)
                except UnicodeDecodeError:
                    pass # Skip non-utf8 files for AST analysis
                
        except Exception as e:
            # print(f"⚠️ Error reading {file_path}: {e}")
            pass

    def _analyze_python_ast(self, content: str, file_path: Path):
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    # Compute structural hash
                    block_hash = self._hash_ast_node(node)
                    
                    # Store metadata
                    name = node.name
                    lineno = node.lineno
                    end_lineno = getattr(node, 'end_lineno', lineno)
                    
                    # Only track if significant size (> 3 lines)
                    if (end_lineno - lineno) > 3:
                        self.code_block_hashes[block_hash].append({
                            'path': file_path,
                            'name': name,
                            'type': type(node).__name__,
                            'lines': f"{lineno}-{end_lineno}",
                            'content_preview': content.splitlines()[lineno-1:lineno+2] # First 3 lines
                        })
        except SyntaxError:
            pass

    def _hash_ast_node(self, node):
        """Compute a hash for an AST node ignoring location."""
        if sys.version_info >= (3, 9):
            # include_attributes=False ignores lineno/col_offset
            dump = ast.dump(node, include_attributes=False)
        else:
            # Fallback for older python: dump and strip manualy is hard, 
            # so we just dump. It's stricter (requires identical formatting/location)
            # but safer than complex regex
            dump = ast.dump(node)
            
        return hashlib.md5(dump.encode('utf-8')).hexdigest()

    def _generate_report(self):
        report_path = self.root_dir / "DUPLICATION_STRATEGIC_PLAN.md"
        
        with open(report_path, "w") as f:
            f.write("# 🕵️ Code Duplication & Refactoring Strategic Plan\n\n")
            f.write(f"**Scan Target:** `{self.root_dir}`\n")
            f.write(f"**Files Scanned:** {self.scanned_files}\n")
            f.write(f"**Date:** {os.popen('date').read().strip()}\n\n")
            
            # 1. Exact File Duplicates
            duplicates = {k: v for k, v in self.file_hashes.items() if len(v) > 1}
            if duplicates:
                f.write("## 1. Exact File Duplicates (Immediate Action Required)\n")
                f.write("These files have identical content. **Strategy:** Delete copies and verify imports.\n\n")
                
                for h, paths in duplicates.items():
                    f.write(f"### Duplicate Group (Count: {len(paths)})\n")
                    for p in paths:
                        try:
                            rel_path = p.relative_to(self.root_dir)
                        except ValueError:
                            rel_path = p
                        f.write(f"- `{rel_path}`\n")
                    f.write("\n")
            else:
                f.write("## 1. Exact File Duplicates\n✅ No exact file duplicates found.\n\n")

            # 2. Code Block Duplicates (Functions/Classes)
            block_dupes = {k: v for k, v in self.code_block_hashes.items() if len(v) > 1}
            
            # Filter out __init__ and common trivial names if needed
            # We filter duplicates that occur only within the same file (e.g. conditional definition)
            filtered_dupes = {}
            for h, occurrences in block_dupes.items():
                files_involved = {str(o['path']) for o in occurrences}
                if len(files_involved) > 1:
                    filtered_dupes[h] = occurrences

            if filtered_dupes:
                f.write("## 2. Duplicate Logic Patterns (Python AST)\n")
                f.write("Functions or classes with **identical structure and logic**. Variable names match exactly.\n")
                f.write("**Strategy:** Extract to a shared utility/service.\n\n")
                
                for h, occurrences in filtered_dupes.items():
                    name = occurrences[0]['name']
                    type_ = occurrences[0]['type']
                    
                    f.write(f"### Pattern: `{name}` ({type_})\n")
                    f.write(f"Found in {len(occurrences)} locations:\n")
                    for o in occurrences:
                        try:
                            rel_path = o['path'].relative_to(self.root_dir)
                        except ValueError:
                            rel_path = o['path']
                        f.write(f"- `{rel_path}` (Lines {o['lines']})\n")
                    
                    f.write("\n**Refactoring Strategy:**\n")
                    f.write(f"1. Extract `{name}` to a shared module (e.g., `app/common/{name}_util.py` or similar).\n")
                    f.write(f"2. Import `{name}` in the identified files.\n")
                    f.write("3. Run tests.\n\n")
                    f.write("---\n")
            else:
                f.write("## 2. Duplicate Logic Patterns\n✅ No cross-file structural duplication detected in Python files.\n\n")

        print(f"✅ Strategic Plan generated: {report_path}")

if __name__ == "__main__":
    # Scan from project root if possible, or current dir
    target_dir = os.getcwd()
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
        
    detector = DuplicationDetector(target_dir)
    detector.scan()

