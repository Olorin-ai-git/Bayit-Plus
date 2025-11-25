#!/usr/bin/env python3
"""
Fix syntax errors caused by migration tool inserting imports in wrong places.
"""

import ast
import os
import re
from typing import List, Tuple


def find_syntax_errors() -> List[Tuple[str, int, str]]:
    """Find all Python files with syntax errors."""
    error_files = []

    for root, dirs, files in os.walk("app"):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    ast.parse(content)
                except SyntaxError as e:
                    error_files.append((file_path, e.lineno, e.msg))
                except Exception:
                    continue

    return error_files


def fix_import_syntax_error(file_path: str) -> bool:
    """
    Fix syntax error caused by bridge logger import inserted in wrong place.
    Returns True if file was fixed, False otherwise.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Pattern: from ... import (
        #          from app.service.logging import get_bridge_logger
        #
        #          ... rest of imports
        #          )

        # Find the problematic pattern
        pattern = r"(from [^)]+import \([^)]*?)(\nfrom app\.service\.logging import get_bridge_logger\n\n)(.*?\))"
        match = re.search(pattern, content, re.DOTALL)

        if match:
            # Extract parts
            before_import = match.group(1)
            bridge_import = match.group(2).strip()
            after_import = match.group(3)

            # Reconstruct correctly
            fixed_import = before_import + "\n" + after_import
            new_content = (
                content[: match.start()]
                + fixed_import
                + "\n"
                + bridge_import
                + content[match.end() :]
            )

            # Write back the fixed content
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)

            print(f"✅ Fixed: {file_path}")
            return True

        return False

    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False


def main():
    print("🔍 Finding Python files with syntax errors...")

    error_files = find_syntax_errors()

    if not error_files:
        print("✅ No syntax errors found!")
        return

    print(f"Found {len(error_files)} files with syntax errors")

    fixed_count = 0
    for file_path, line, msg in error_files:
        print(f"\n🔧 Attempting to fix: {file_path}:{line}")
        if fix_import_syntax_error(file_path):
            fixed_count += 1
        else:
            # Try to verify if it's still a syntax error
            try:
                with open(file_path, "r") as f:
                    content = f.read()
                ast.parse(content)
                print(f"✅ Actually OK: {file_path}")
            except SyntaxError:
                print(f"❌ Still has syntax error: {file_path}:{line}: {msg}")

    print(f"\n📊 Summary:")
    print(f"   Files with syntax errors: {len(error_files)}")
    print(f"   Files fixed: {fixed_count}")

    # Final verification
    print(f"\n🔍 Final verification...")
    remaining_errors = find_syntax_errors()
    if remaining_errors:
        print(f"❌ {len(remaining_errors)} files still have syntax errors:")
        for file_path, line, msg in remaining_errors[:5]:
            print(f"   {file_path}:{line}: {msg}")
    else:
        print("✅ All syntax errors resolved!")


if __name__ == "__main__":
    main()
