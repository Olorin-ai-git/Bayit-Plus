#!/usr/bin/env python3
"""
Fix Vue template syntax in markdown files for VitePress.
Wraps code blocks containing HTML/JSX with ::: v-pre to prevent parsing.
"""

import os
import re
from pathlib import Path

def has_html_tags(text):
    """Check if text contains HTML-like tags."""
    # Match opening tags like <button, <div, <View, etc.
    return bool(re.search(r'<[a-zA-Z][^>]*>', text))

def fix_markdown_file(filepath):
    """Fix Vue template syntax in a markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_lines = []
    in_code_fence = False
    code_fence_start = 0
    code_block_lines = []
    fence_marker = ''

    for i, line in enumerate(lines):
        # Check for code fence markers
        fence_match = re.match(r'^(```+)(\w*)', line)

        if fence_match and not in_code_fence:
            # Start of code fence
            in_code_fence = True
            fence_marker = fence_match.group(1)
            code_fence_start = len(fixed_lines)
            code_block_lines = [line]
        elif in_code_fence and line.startswith(fence_marker):
            # End of code fence
            code_block_lines.append(line)
            in_code_fence = False

            # Check if code block contains HTML tags
            code_content = ''.join(code_block_lines)
            if has_html_tags(code_content):
                # Wrap with v-pre
                fixed_lines.append('::: v-pre\n')
                fixed_lines.extend(code_block_lines)
                fixed_lines.append(':::\n')
            else:
                fixed_lines.extend(code_block_lines)

            code_block_lines = []
        elif in_code_fence:
            # Inside code fence
            code_block_lines.append(line)
        else:
            # Regular line
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
    docs_dir = Path('/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/docs')

    # Find all markdown files
    md_files = list(docs_dir.rglob('*.md'))

    print(f"Found {len(md_files)} markdown files")

    fixed_count = 0
    for md_file in md_files:
        if fix_markdown_file(md_file):
            fixed_count += 1
            print(f"✓ Fixed: {md_file.relative_to(docs_dir)}")

    print(f"\n✅ Fixed {fixed_count} files with HTML/JSX in code blocks")

if __name__ == '__main__':
    main()
