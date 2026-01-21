#!/usr/bin/env python3
"""
StyleSheet.create() to TailwindCSS Migration Script

This script converts React Native StyleSheet.create() usage to TailwindCSS/NativeWind className syntax.
"""

import os
import re
import sys
from pathlib import Path

# Style property to Tailwind class mappings
STYLE_MAPPINGS = {
    # Flex
    r"flex:\s*1": "flex-1",
    r"flexDirection:\s*['\"]row['\"]": "flex-row",
    r"flexDirection:\s*['\"]column['\"]": "flex-col",
    r"flexDirection:\s*['\"]row-reverse['\"]": "flex-row-reverse",
    r"flexDirection:\s*['\"]column-reverse['\"]": "flex-col-reverse",
    r"flexWrap:\s*['\"]wrap['\"]": "flex-wrap",
    r"alignItems:\s*['\"]center['\"]": "items-center",
    r"alignItems:\s*['\"]flex-start['\"]": "items-start",
    r"alignItems:\s*['\"]flex-end['\"]": "items-end",
    r"alignItems:\s*['\"]stretch['\"]": "items-stretch",
    r"alignItems:\s*['\"]baseline['\"]": "items-baseline",
    r"justifyContent:\s*['\"]center['\"]": "justify-center",
    r"justifyContent:\s*['\"]flex-start['\"]": "justify-start",
    r"justifyContent:\s*['\"]flex-end['\"]": "justify-end",
    r"justifyContent:\s*['\"]space-between['\"]": "justify-between",
    r"justifyContent:\s*['\"]space-around['\"]": "justify-around",
    r"justifyContent:\s*['\"]space-evenly['\"]": "justify-evenly",
    r"alignSelf:\s*['\"]center['\"]": "self-center",
    r"alignSelf:\s*['\"]flex-start['\"]": "self-start",
    r"alignSelf:\s*['\"]flex-end['\"]": "self-end",

    # Position
    r"position:\s*['\"]absolute['\"]": "absolute",
    r"position:\s*['\"]relative['\"]": "relative",

    # Display
    r"overflow:\s*['\"]hidden['\"]": "overflow-hidden",
    r"overflow:\s*['\"]scroll['\"]": "overflow-scroll",
    r"overflow:\s*['\"]visible['\"]": "overflow-visible",

    # Width/Height
    r"width:\s*['\"]100%['\"]": "w-full",
    r"height:\s*['\"]100%['\"]": "h-full",

    # Text
    r"fontWeight:\s*['\"]bold['\"]": "font-bold",
    r"fontWeight:\s*['\"]500['\"]": "font-medium",
    r"fontWeight:\s*['\"]600['\"]": "font-semibold",
    r"fontWeight:\s*['\"]700['\"]": "font-bold",
    r"fontWeight:\s*['\"]800['\"]": "font-extrabold",
    r"fontWeight:\s*['\"]900['\"]": "font-black",
    r"textAlign:\s*['\"]center['\"]": "text-center",
    r"textAlign:\s*['\"]left['\"]": "text-left",
    r"textAlign:\s*['\"]right['\"]": "text-right",
    r"textAlign:\s*['\"]justify['\"]": "text-justify",
}

# Spacing mappings (Tailwind scale: 1 = 0.25rem = 4px)
SPACING_MAP = {
    0: "0",
    1: "0.5",
    2: "0.5",
    4: "1",
    6: "1.5",
    8: "2",
    10: "2.5",
    12: "3",
    14: "3.5",
    16: "4",
    20: "5",
    24: "6",
    28: "7",
    32: "8",
    40: "10",
    48: "12",
    56: "14",
    64: "16",
}

def convert_spacing(value):
    """Convert numeric spacing to Tailwind scale"""
    try:
        num = int(value)
        if num in SPACING_MAP:
            return SPACING_MAP[num]
        # Approximate for values not in map
        return str(num // 4)
    except:
        return value


def remove_stylesheet_import(content):
    """Remove StyleSheet from imports"""
    # Remove StyleSheet from import list
    content = re.sub(r',\s*StyleSheet\s*', '', content)
    content = re.sub(r'StyleSheet\s*,\s*', '', content)

    # If StyleSheet was the only import from react-native, might need cleanup
    # This handles edge cases
    content = re.sub(r"import\s*{\s*}\s*from\s*['\"]react-native['\"];?\s*\n", '', content)

    return content


def remove_theme_imports(content):
    """Remove unused theme imports after conversion"""
    # This is conservative - only removes if they appear to be unused
    # In practice, some files might still use theme for dynamic values
    return content


def process_file(file_path):
    """Process a single file to migrate styles"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file uses StyleSheet.create
    if 'StyleSheet.create' not in content:
        print(f"  Skipping (no StyleSheet.create found)")
        return False

    original_content = content

    # Remove StyleSheet from imports
    content = remove_stylesheet_import(content)

    # For now, print that manual conversion is needed
    # Full automation would require AST parsing
    print(f"  ⚠️  File needs manual conversion")
    print(f"  Has StyleSheet.create - requires careful style-to-className conversion")

    return False


def main():
    """Main migration process"""
    # Get the directory from command line or use default
    if len(sys.argv) > 1:
        base_dir = sys.argv[1]
    else:
        base_dir = "/Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/components"

    base_path = Path(base_dir)

    if not base_path.exists():
        print(f"Error: Directory not found: {base_dir}")
        return 1

    # Find all .tsx files
    tsx_files = list(base_path.rglob("*.tsx"))

    print(f"\nFound {len(tsx_files)} .tsx files in {base_dir}")
    print(f"=" * 80)

    # Process each file
    processed = 0
    skipped = 0

    for tsx_file in sorted(tsx_files):
        if process_file(tsx_file):
            processed += 1
        else:
            skipped += 1

    print(f"\n" + "=" * 80)
    print(f"Summary:")
    print(f"  Total files: {len(tsx_files)}")
    print(f"  Processed: {processed}")
    print(f"  Skipped: {skipped}")
    print(f"\nNote: Due to complexity, manual conversion is recommended.")
    print(f"Use the following patterns:")
    print(f"  - padding: spacing.lg → className=\"p-6\"")
    print(f"  - flexDirection: 'row' → className=\"flex-row\"")
    print(f"  - backgroundColor: colors.primary → className=\"bg-purple-500\"")

    return 0


if __name__ == "__main__":
    sys.exit(main())
