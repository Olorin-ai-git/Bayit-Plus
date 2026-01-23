#!/usr/bin/env python3
"""
Migrate StyleSheet.create() to TailwindCSS/NativeWind className
"""
import re
import os
import sys
from pathlib import Path

# Add backend to path to import ScriptConfig
sys.path.insert(0, str(Path(__file__).parent / "backend"))
try:
    from scripts.config.script_config import get_script_config
except ImportError:
    # Fallback if config not available
    get_script_config = None

# Style mappings
STYLE_MAP = {
    # Layout
    'container': 'flex-1 p-4',
    'headerActions': 'flex-row gap-2',
    'actionsRow': 'flex-row gap-1',

    # Buttons
    'filterButton': 'flex-row items-center px-3 py-2 bg-black/20 backdrop-blur-xl rounded-md border border-white/10',
    'exportButton': 'px-3 py-2 bg-blue-500 rounded-md',
    'addButton': 'px-3 py-2 bg-blue-500 rounded-md',
    'createButton': 'px-3 py-2 bg-blue-500 rounded-md',
    'actionButton': 'w-[30px] h-[30px] rounded-sm bg-gray-800 justify-center items-center',
    'saveButton': 'bg-purple-600 rounded-md py-3 items-center mt-4',
    'closeButton': 'px-4 py-2 bg-black/20 rounded-md border border-white/10',

    # Text
    'filterButtonText': 'text-sm text-white',
    'titleText': 'text-sm font-semibold text-white',
    'bodyText': 'text-sm text-gray-400',
    'dateText': 'text-xs text-gray-400',
    'statusText': 'text-xs font-semibold capitalize',

    # Cards
    'summaryCard': 'flex-1 bg-black/20 rounded-md border border-white/10 p-3 items-center',
    'statCard': 'flex-1 bg-black/20 rounded-md border border-white/10 p-3 items-center',

    # Modals
    'modalOverlay': 'flex-1 bg-black/50 justify-center items-center',
    'modalContent': 'w-[90%] max-w-[500px] bg-gray-900/95 rounded-lg p-4 border border-white/10',
    'modalTitle': 'text-xl font-bold text-white mb-4',
    'formGroup': 'mb-3',
    'formLabel': 'text-sm font-semibold text-white mb-1',
    'formInput': 'bg-gray-800 rounded-md border border-white/10 px-3 py-2 text-white text-base',
    'modalActions': 'flex-row justify-end gap-2',

    # Badges
    'statusBadge': 'px-2 py-0.5 rounded-sm self-start',
}

def remove_stylesheet_import(content):
    """Remove StyleSheet from imports"""
    # Remove StyleSheet from import statement
    content = re.sub(r',\s*StyleSheet', '', content)
    content = re.sub(r'StyleSheet,\s*', '', content)
    return content

def remove_stylesheet_block(content):
    """Remove the entire StyleSheet.create block"""
    # Find and remove const styles = StyleSheet.create({...});
    pattern = r'const styles = StyleSheet\.create\({[\s\S]*?\}\);'
    content = re.sub(pattern, '', content)
    return content

def convert_style_to_classname(content, style_name, class_name):
    """Convert style={styles.xyz} to className="..."""""
    # Handle various patterns
    patterns = [
        (f'style={{styles.{style_name}}}', f'className="{class_name}"'),
        (f'style={{[styles.{style_name},', f'style={{['), # Arrays - keep for dynamic
    ]

    for pattern, replacement in patterns:
        content = content.replace(pattern, replacement)

    return content

def process_file(filepath):
    """Process a single TypeScript file"""
    print(f"Processing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file uses StyleSheet
    if 'StyleSheet.create' not in content:
        print(f"  Skipping (no StyleSheet)")
        return

    # Step 1: Remove StyleSheet from imports
    content = remove_stylesheet_import(content)

    # Step 2: Convert style references to className
    for style_name, class_name in STYLE_MAP.items():
        content = convert_style_to_classname(content, style_name, class_name)

    # Step 3: Remove StyleSheet.create block
    content = remove_stylesheet_block(content)

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ Migrated")

def main():
    # Use ScriptConfig if available, otherwise fallback to git root
    if get_script_config:
        config = get_script_config()
        admin_dir = config.shared_dir / "screens" / "admin"
    else:
        # Fallback: detect project root via git
        try:
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True,
                text=True,
                check=True,
            )
            project_root = Path(result.stdout.strip())
            admin_dir = project_root / "shared" / "screens" / "admin"
        except:
            admin_dir = Path(__file__).parent / "shared" / "screens" / "admin"

    admin_dir = str(admin_dir)

    for filename in os.listdir(admin_dir):
        if filename.endswith('.tsx') and filename != 'index.ts':
            filepath = os.path.join(admin_dir, filename)
            process_file(filepath)

if __name__ == '__main__':
    main()
