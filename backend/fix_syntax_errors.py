#!/usr/bin/env python3
"""Fix missing commas in Python files caused by sed batch replacement."""

import re
import sys
from pathlib import Path


def fix_missing_commas(content: str) -> str:
    """Fix missing commas in function parameters and dict literals."""
    lines = content.split('\n')
    fixed_lines = []
    in_dict = 0
    in_function_params = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Track dictionary depth
        in_dict += line.count('{') - line.count('}')

        # Track function parameter lists
        if 'def ' in line and '(' in line:
            in_function_params = True
        if in_function_params and ')' in line and '->' in line:
            in_function_params = False

        # Fix missing commas - look for patterns like: "key": value\n
        # followed by "key": value (no comma before closing or another key)
        if i < len(lines) - 1:
            next_line = lines[i + 1].strip()

            # Pattern: ends with value, next line starts with string/key or closes
            # Common patterns that need commas:
            # 1. "key": "value"\n    "key2"
            # 2. param: type\n    param2:
            # 3. field = value\n    field2 =

            needs_comma = False

            # In dict: string/value followed by string/closing
            if in_dict > 0 and not stripped.endswith(','):
                if (stripped and not stripped.startswith('#')
                    and not stripped.endswith('{')
                    and not stripped.endswith('[')):
                    if (next_line.startswith('"') or
                        next_line.startswith("'") or
                        next_line.startswith('}')):
                        needs_comma = True

            # In function params: type hint followed by another param or )
            if in_function_params and not stripped.endswith(','):
                if ':' in stripped and '=' in stripped:
                    if (next_line.endswith(':') or
                        next_line.startswith(')') or
                        ':' in next_line):
                        needs_comma = True
                elif ':' in stripped and not stripped.startswith('def'):
                    if next_line.startswith(')'):
                        pass  # Last param, no comma needed
                    elif ':' in next_line or next_line.startswith(')'):
                        needs_comma = True

            if needs_comma and not stripped.endswith(','):
                line = line.rstrip() + ','

        fixed_lines.append(line)

    return '\n'.join(fixed_lines)


def main():
    files_to_fix = [
        "app/services/kids_content_seeder.py",
        "app/services/kids_podcast_service.py",
        "app/services/series_linker_service.py",
        "app/services/kids_public_domain_importer.py",
        "app/services/content_taxonomy_migration.py",
        "app/services/auto_fixer.py",
        "app/services/youtube_kids_service.py",
        "app/services/ai_agent/executors/metadata.py",
        "app/services/ai_agent/executors/series.py",
        "app/services/kids_content_auditor.py",
    ]

    for filepath in files_to_fix:
        path = Path(filepath)
        if not path.exists():
            print(f"⚠️  Not found: {filepath}")
            continue

        print(f"Fixing: {filepath}")
        content = path.read_text()
        fixed = fix_missing_commas(content)
        path.write_text(fixed)
        print(f"✅ Fixed: {filepath}")


if __name__ == "__main__":
    main()
