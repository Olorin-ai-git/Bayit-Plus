#!/usr/bin/env python3
"""
Update uploads section in en.json with comprehensive i18n keys
"""

import json
import sys
from pathlib import Path

def main():
    # Paths
    locales_dir = Path(__file__).parent.parent / "locales"
    en_json_path = locales_dir / "en.json"
    uploads_complete_path = locales_dir / "uploads-complete-en.json"
    backup_path = locales_dir / "en.json.backup"

    # Read existing en.json
    with open(en_json_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    # Read complete uploads section
    with open(uploads_complete_path, 'r', encoding='utf-8') as f:
        uploads_data = json.load(f)

    # Backup original file
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)

    # Replace uploads section
    if 'admin' in en_data and 'uploads' in en_data['admin']:
        en_data['admin']['uploads'] = uploads_data['uploads']
    else:
        print("ERROR: admin.uploads section not found in en.json")
        sys.exit(1)

    # Write updated file
    with open(en_json_path, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)

    # Count keys
    def count_keys(obj, prefix=''):
        count = 0
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, dict):
                    count += count_keys(value, f"{prefix}.{key}" if prefix else key)
                else:
                    count += 1
        return count

    total_keys = count_keys(uploads_data['uploads'])

    print(f"✅ Successfully updated admin.uploads section in en.json")
    print(f"📊 Total i18n keys added: {total_keys}")
    print(f"💾 Backup saved to: {backup_path}")
    print(f"✨ Next step: Translate to 9 other languages (he, es, zh, fr, it, hi, ta, bn, ja)")

if __name__ == '__main__':
    main()
