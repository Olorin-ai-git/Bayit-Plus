#!/usr/bin/env python3
"""
KillDups: Code Duplication Detector & Strategy Generator
=======================================================
Scans the codebase for:
1. Exact file duplicates (MD5)
2. Near-duplicate text files (Fuzzy matching > 85% similarity)
3. Structural logic duplication in Python (AST)

Generates a strategic refactoring plan.
"""

import os
import sys
import ast
import hashlib
import warnings
import difflib
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Configuration
IGNORE_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv', 'env', 
    'dist', 'build', 'coverage', '.pytest_cache', 'migrations',
    'artifacts', 'logs', '.idea', '.vscode', '.tox', 'dataconnect-generated',
    'site-packages'
}
# Binary / Asset extensions to ignore for text analysis
IGNORE_EXTENSIONS = {
    '.pyc', '.pyo', '.pyd', '.so', '.dll', '.class', '.o', '.obj', '.exe', '.DS_Store',
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.zip', '.tar', '.gz', '.db', '.sqlite', '.sqlite3', '.pkl', '.bin'
}

class DuplicationDetector:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        
        # Exact Matches
        self.file_hashes: Dict[str, List[Path]] = defaultdict(list)
        
        # Near Duplicate Detection (Bucket by Extension -> Size)
        # { '.py': { 1024: [path1, path2], ... } }
        self.file_buckets: Dict[str, Dict[int, List[Path]]] = defaultdict(lambda: defaultdict(list))
        self.near_duplicates: List[Tuple[Path, Path, float]] = []
        
        # AST Logic
        self.code_block_hashes: Dict[str, List[Dict]] = defaultdict(list)
        
        self.scanned_files = 0

    def scan(self):
        print(f"🔍 Scanning codebase at {self.root_dir}...")
        print("   (This might take a moment as we perform deep analysis...)")
        
        for root, dirs, files in os.walk(self.root_dir):
            # Filter directories in place
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix.lower() not in IGNORE_EXTENSIONS:
                    self._process_file(file_path)
        
        print(f"\n✅ Scanned {self.scanned_files} files.")
        
        print("🔄 Analyzing for near-duplicates (fuzzy matching)...")
        self._detect_near_duplicates()
        
        self._generate_report()

    def _process_file(self, file_path: Path):
        self.scanned_files += 1
        if self.scanned_files % 100 == 0:
            print(".", end="", flush=True)
            
        try:
            # Read as bytes first
            content_bytes = file_path.read_bytes()
            size = len(content_bytes)
            
            # 1. Exact File Duplication
            file_hash = hashlib.md5(content_bytes).hexdigest()
            self.file_hashes[file_hash].append(file_path)
            
            # Bucket for near-duplicate checking
            ext = file_path.suffix.lower()
            self.file_buckets[ext][size].append(file_path)
            
            # 2. Function/Class Duplication (Python only)
            if ext == '.py':
                try:
                    content_str = content_bytes.decode('utf-8')
                    self._analyze_python_ast(content_str, file_path)
                except UnicodeDecodeError:
                    pass 
                
        except Exception:
            pass

    def _detect_near_duplicates(self):
        """Compare files with same extension and similar size."""
        # Threshold: 85% similarity
        THRESHOLD = 0.85
        
        for ext, size_buckets in self.file_buckets.items():
            sizes = sorted(size_buckets.keys())
            
            # Compare each file with files of similar size (+/- 20%)
            for i, size in enumerate(sizes):
                # Define size window
                min_size = size * 0.8
                max_size = size * 1.2
                
                # Get candidate files from neighboring buckets
                candidates = []
                # Look ahead in sorted sizes until out of range
                for j in range(i, len(sizes)):
                    other_size = sizes[j]
                    if other_size > max_size:
                        break
                    candidates.extend(size_buckets[other_size])
                
                # Compare candidates (N^2 within local window)
                # Optimization: Don't compare identical files (already caught)
                current_files = size_buckets[size]
                
                for f1 in current_files:
                    try:
                        content1 = f1.read_text(errors='ignore')
                        # Skip very small files
                        if len(content1) < 50: continue
                        
                        for f2 in candidates:
                            if f1 == f2: continue
                            # Avoid duplicate pairs (A vs B, B vs A)
                            if str(f1) >= str(f2): continue
                            
                            try:
                                content2 = f2.read_text(errors='ignore')
                                # Quick ratio check
                                ratio = difflib.SequenceMatcher(None, content1, content2).quick_ratio()
                                
                                if ratio >= THRESHOLD:
                                    # Double check exact match to filter out 1.0 (already handled)
                                    if ratio == 1.0: continue
                                    self.near_duplicates.append((f1, f2, ratio))
                            except Exception: pass
                    except Exception: pass

    def _analyze_python_ast(self, content: str, file_path: Path):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", SyntaxWarning)
                tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    block_hash = self._hash_ast_node(node)
                    
                    name = node.name
                    lineno = node.lineno
                    end_lineno = getattr(node, 'end_lineno', lineno)
                    
                    if (end_lineno - lineno) > 3:
                        self.code_block_hashes[block_hash].append({
                            'path': file_path,
                            'name': name,
                            'type': type(node).__name__,
                            'lines': f"{lineno}-{end_lineno}"
                        })
        except SyntaxError:
            pass

    def _hash_ast_node(self, node):
        if sys.version_info >= (3, 9):
            dump = ast.dump(node, include_attributes=False)
        else:
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
                        try: rel_path = p.relative_to(self.root_dir)
                        except: rel_path = p
                        f.write(f"- `{rel_path}`\n")
                    f.write("\n")
            else:
                f.write("## 1. Exact File Duplicates\n✅ No exact file duplicates found.\n\n")

            # 2. Near Duplicates
            if self.near_duplicates:
                f.write("## 2. Near-Duplicate Files (>85% Similarity)\n")
                f.write("These files are almost identical. **Strategy:** Diff them, merge logic, and remove one.\n\n")
                # Sort by similarity desc
                self.near_duplicates.sort(key=lambda x: x[2], reverse=True)
                
                for f1, f2, ratio in self.near_duplicates:
                    try: p1 = f1.relative_to(self.root_dir)
                    except: p1 = f1
                    try: p2 = f2.relative_to(self.root_dir)
                    except: p2 = f2
                    
                    f.write(f"- **{ratio*100:.1f}% Match**:\n")
                    f.write(f"  - `{p1}`\n")
                    f.write(f"  - `{p2}`\n")
            else:
                f.write("## 2. Near-Duplicate Files\n✅ No near-duplicate files found.\n\n")

            # 3. Code Block Duplicates
            block_dupes = {k: v for k, v in self.code_block_hashes.items() if len(v) > 1}
            filtered_dupes = {}
            for h, occurrences in block_dupes.items():
                files_involved = {str(o['path']) for o in occurrences}
                if len(files_involved) > 1:
                    filtered_dupes[h] = occurrences

            if filtered_dupes:
                f.write("## 3. Duplicate Logic Patterns (Python AST)\n")
                f.write("Functions/Classes with identical logic structure.\n\n")
                
                for h, occurrences in filtered_dupes.items():
                    name = occurrences[0]['name']
                    type_ = occurrences[0]['type']
                    f.write(f"### Pattern: `{name}` ({type_})\n")
                    for o in occurrences:
                        try: rel_path = o['path'].relative_to(self.root_dir)
                        except: rel_path = o['path']
                        f.write(f"- `{rel_path}` (Lines {o['lines']})\n")
                    f.write("\n")
            else:
                f.write("## 3. Duplicate Logic Patterns\n✅ No structural duplication detected.\n\n")

        print(f"✅ Strategic Plan generated: {report_path}")

if __name__ == "__main__":
    target_dir = os.getcwd()
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    detector = DuplicationDetector(target_dir)
    detector.scan()
