#!/usr/bin/env python3
"""
Fix Tailwind className template literal interpolations across all converted files.

Converts dynamic template literals to conditional expressions so Tailwind can scan them.

Example:
  className={`text-${isMobilePhone ? 'base' : 'lg'}`}
  →
  className={isMobilePhone ? "text-base" : "text-lg"}
"""

import re
import glob
import os
from pathlib import Path

def fix_className_interpolation(content):
    """Fix template literal interpolations in className props."""

    fixed_count = 0

    # Pattern 1: Simple interpolation with ternary
    # className={`prefix-${condition ? 'value1' : 'value2'}`}
    pattern1 = r'''className=\{`([a-z-]*)-\$\{([^}]+\?[^:]+:[^}]+)\}`\}'''

    def replace1(match):
        nonlocal fixed_count
        prefix = match.group(1)
        ternary = match.group(2).strip()

        # Extract condition and values from ternary
        ternary_match = re.match(r'(.+?)\s*\?\s*["\']([^"\']+)["\']\s*:\s*["\']([^"\']+)["\']', ternary)
        if ternary_match:
            condition = ternary_match.group(1)
            val1 = ternary_match.group(2)
            val2 = ternary_match.group(3)
            fixed_count += 1
            return f'className={{{condition} ? "{prefix}-{val1}" : "{prefix}-{val2}"}}'
        return match.group(0)

    content = re.sub(pattern1, replace1, content)

    # Pattern 2: Multiple classes with interpolation
    # className={`class1 class2-${condition ? 'val1' : 'val2'} class3`}
    pattern2 = r'''className=\{`([^`]*?)\$\{([^}]+\?[^:]+:[^}]+)\}([^`]*?)`\}'''

    def replace2(match):
        nonlocal fixed_count
        before = match.group(1).strip()
        ternary = match.group(2).strip()
        after = match.group(3).strip()

        # Extract the interpolated part (e.g., "text-${size}")
        # Find what comes before ${
        prefix_match = re.search(r'(\S+)-$', before)
        if not prefix_match:
            # No prefix before ${, check if ternary has the full class
            ternary_match = re.match(r'(.+?)\s*\?\s*["\']([^"\']+)["\']\s*:\s*["\']([^"\']+)["\']', ternary)
            if ternary_match:
                condition = ternary_match.group(1)
                val1 = ternary_match.group(2)
                val2 = ternary_match.group(3)

                # Build complete class strings
                class1_parts = [before, val1, after]
                class2_parts = [before, val2, after]
                class1 = ' '.join(p for p in class1_parts if p).strip()
                class2 = ' '.join(p for p in class2_parts if p).strip()

                fixed_count += 1
                return f'className={{{condition} ? "{class1}" : "{class2}"}}'
        else:
            # Has prefix before ${
            prefix = prefix_match.group(1)
            before_without_prefix = before[:-len(prefix)-1].strip()

            ternary_match = re.match(r'(.+?)\s*\?\s*["\']([^"\']+)["\']\s*:\s*["\']([^"\']+)["\']', ternary)
            if ternary_match:
                condition = ternary_match.group(1)
                val1 = ternary_match.group(2)
                val2 = ternary_match.group(3)

                # Build complete class strings
                class1_parts = [before_without_prefix, f"{prefix}-{val1}", after]
                class2_parts = [before_without_prefix, f"{prefix}-{val2}", after]
                class1 = ' '.join(p for p in class1_parts if p).strip()
                class2 = ' '.join(p for p in class2_parts if p).strip()

                fixed_count += 1
                return f'className={{{condition} ? "{class1}" : "{class2}"}}'

        return match.group(0)

    content = re.sub(pattern2, replace2, content)

    # Pattern 3: Direct ternary in template literal (no prefix)
    # className={`${condition ? 'class1' : 'class2'}`}
    pattern3 = r'''className=\{`\$\{([^}]+\?[^:]+:[^}]+)\}`\}'''

    def replace3(match):
        nonlocal fixed_count
        ternary = match.group(1).strip()

        ternary_match = re.match(r'(.+?)\s*\?\s*["\']([^"\']+)["\']\s*:\s*["\']([^"\']+)["\']', ternary)
        if ternary_match:
            condition = ternary_match.group(1)
            val1 = ternary_match.group(2)
            val2 = ternary_match.group(3)
            fixed_count += 1
            return f'className={{{condition} ? "{val1}" : "{val2}"}}'
        return match.group(0)

    content = re.sub(pattern3, replace3, content)

    return content, fixed_count

def process_file(filepath):
    """Process a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()

        fixed_content, count = fix_className_interpolation(original_content)

        if count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return count
        return 0
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return 0

def main():
    """Main function to process all files."""
    base_dir = Path(__file__).parent

    # Patterns to match files
    patterns = [
        'shared/components/**/*.tsx',
        'shared/screens/**/*.tsx',
        'web/src/components/**/*.tsx',
        'web/src/pages/**/*.tsx',
        'web/src/**/*.jsx',
    ]

    total_fixed = 0
    files_processed = 0

    for pattern in patterns:
        files = glob.glob(str(base_dir / pattern), recursive=True)

        for filepath in files:
            count = process_file(filepath)
            if count > 0:
                rel_path = os.path.relpath(filepath, base_dir)
                print(f"✅ Fixed {count} interpolations in {rel_path}")
                total_fixed += count
                files_processed += 1

    print(f"\n🎉 Complete!")
    print(f"   Fixed: {total_fixed} interpolations")
    print(f"   Files: {files_processed}")
    print(f"\nNext steps:")
    print(f"1. Review changes: git diff")
    print(f"2. Rebuild: cd web && npm run build")
    print(f"3. Test: npm run start")

if __name__ == '__main__':
    main()
