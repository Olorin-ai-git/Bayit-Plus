#!/usr/bin/env python3
"""
Fix TypeScript generic syntax in markdown files for VitePress.
Escapes < and > in TypeScript type annotations outside of code fences.
"""

import os
import re
from pathlib import Path

def fix_markdown_file(filepath):
    """Fix TypeScript generic syntax in a markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_lines = []
    in_code_fence = False
    in_vpre = False
    fence_marker = ''

    for i, line in enumerate(lines):
        # Check for v-pre blocks
        if line.strip() == '::: v-pre':
            in_vpre = True
            fixed_lines.append(line)
            continue
        elif line.strip() == ':::' and in_vpre:
            in_vpre = False
            fixed_lines.append(line)
            continue

        # Check for code fences
        fence_match = re.match(r'^(```+)', line)
        if fence_match and not in_code_fence:
            in_code_fence = True
            fence_marker = fence_match.group(1)
            fixed_lines.append(line)
            continue
        elif in_code_fence and line.startswith(fence_marker):
            in_code_fence = False
            fixed_lines.append(line)
            continue

        # Fix TypeScript generics outside code fences and v-pre blocks
        if not in_code_fence and not in_vpre:
            # Replace < and > in TypeScript type annotations
            # Pattern: type names with generics like Promise<void>, Partial<Config>, etc.
            modified_line = re.sub(r'<([^>]+)>', r'&lt;\1&gt;', line)
            if modified_line != line:
                fixed_lines.append(modified_line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)

    fixed_content = ''.join(fixed_lines)
    original_content = ''.join(lines)

    # Only write if content changed
    if fixed_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    return False

def main():
    """Process all markdown files in the docs directory."""
    docs_dir = Path('/Users/olorin/Documents/olorin/olorin-media/bayit-plus/docs')

    # Find all markdown files
    md_files = list(docs_dir.rglob('*.md'))

    print(f"Found {len(md_files)} markdown files")

    fixed_count = 0
    for md_file in md_files:
        if fix_markdown_file(md_file):
            fixed_count += 1
            print(f"✓ Fixed: {md_file.relative_to(docs_dir)}")

    print(f"\n✅ Fixed {fixed_count} files with TypeScript generic syntax")

if __name__ == '__main__':
    main()
