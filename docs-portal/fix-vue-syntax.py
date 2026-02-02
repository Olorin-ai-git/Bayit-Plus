#!/usr/bin/env python3
"""
Fix Vue template syntax in markdown files for VitePress.
Escapes {{ and }} outside of code fences to prevent Vue template parsing errors.
"""

import os
import re
from pathlib import Path

def fix_markdown_file(filepath):
    """Fix Vue template syntax in a markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split content into sections (code fences vs regular text)
    # Pattern to match code fences: ```language ... ```
    pattern = r'(```[\s\S]*?```)'
    parts = re.split(pattern, content)

    fixed_parts = []
    for i, part in enumerate(parts):
        # Even indices are regular text, odd indices are code fences
        if i % 2 == 0:
            # Regular text - escape {{ and }}
            part = part.replace('{{', r'\{\{')
            part = part.replace('}}', r'\}\}')
        # Code fences - leave unchanged
        fixed_parts.append(part)

    fixed_content = ''.join(fixed_parts)

    # Only write if content changed
    if fixed_content != content:
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

    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
