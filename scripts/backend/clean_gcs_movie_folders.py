#!/usr/bin/env python3
"""
Clean GCS Movie Folder Names
Renames all messy movie folders in Google Cloud Storage to clean names.
"""

import json
import re
import subprocess


def clean_folder_name(folder_name):
    """Clean a folder name by removing junk."""
    # Remove gs:// prefix and trailing slash
    name = folder_name.replace("gs://bayit-plus-media-new/movies/", "").rstrip("/")

    # Replace underscores with spaces
    name = name.replace("_", " ")

    # Patterns to remove
    junk_patterns = [
        r"\bp\b",  # Single 'p'
        r"\b(1080p|720p|480p|360p|4K|2160p|HDRip|WEBRip|BluRay|BRRip|DVDRip)\b",
        r"\bWEB-?DL\b",
        r"\[YTS\.MX\]",
        r"\[YTS\]",
        r"\[YIFY\]",
        r"\[RARBG\]",
        r"\[MX\]",
        r"\(.*?\)",
        r"\b(YIFY|YTS|RARBG|BOKUTOX|BOKUT|MDMA|BoK|GAZ|EVO|juggs)\b",
        r"\b(XviD|XViD|x264|h264|h265|HEVC|AAC|AC3|DTS)\b",
        r"\b(WEB|LINE|R5|CAM|TS|TC|Rip)\b",
        r"\b(TV|com|cd1|Eng)\b",
        r"-\s*MX\b",
        r"-\s*hV\b",
        r"-\s*AMIABLE\b",
        r"-\s*Sample\b",
        r"-\s*EVO\b",
    ]

    # Apply all patterns
    for pattern in junk_patterns:
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)

    # Clean up extra spaces and dashes
    name = re.sub(r"\s+", " ", name)  # Multiple spaces to one
    name = re.sub(r"\s*-\s*$", "", name)  # Trailing dash
    name = re.sub(r"^\s*-\s*", "", name)  # Leading dash
    name = name.strip()

    # Replace spaces with underscores for folder name
    name = name.replace(" ", "_")

    # If empty, return original
    if not name or len(name) < 2:
        return folder_name.replace("gs://bayit-plus-media-new/movies/", "").rstrip("/")

    return name


def get_all_movie_folders():
    """Get list of all movie folders in GCS."""
    result = subprocess.run(
        ["gcloud", "storage", "ls", "gs://bayit-plus-media-new/movies/"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Error listing folders: {result.stderr}")
        return []

    folders = [
        line.strip() for line in result.stdout.strip().split("\n") if line.strip()
    ]
    return folders


def rename_folder(old_path, new_name):
    """Rename a folder in GCS by moving all its contents."""
    # Extract old folder name
    old_name = old_path.replace("gs://bayit-plus-media-new/movies/", "").rstrip("/")

    # Skip if names are the same
    if old_name == new_name:
        return True, "No change needed"

    new_path = f"gs://bayit-plus-media-new/movies/{new_name}/"

    print(f"  Renaming: {old_name}")
    print(f"        →: {new_name}")

    # Move the entire folder using gsutil (has better recursive support)
    result = subprocess.run(
        ["gsutil", "mv", old_path, new_path], capture_output=True, text=True
    )

    if result.returncode != 0:
        return False, result.stderr

    return True, "Success"


def main():
    print("🧹 Starting GCS Movie Folder Cleanup...")
    print("=" * 70)

    # Get all folders
    print("\nFetching movie folders from GCS...")
    folders = get_all_movie_folders()
    print(f"Found {len(folders)} folders")

    if not folders:
        print("No folders found!")
        return

    # Generate rename plan
    rename_plan = []
    for folder in folders:
        original = folder.replace("gs://bayit-plus-media-new/movies/", "").rstrip("/")
        cleaned = clean_folder_name(folder)

        if original != cleaned:
            rename_plan.append(
                {"old_path": folder, "old_name": original, "new_name": cleaned}
            )

    if not rename_plan:
        print("\n✅ All folders already have clean names!")
        return

    print(f"\n📋 Found {len(rename_plan)} folders to clean:")
    print("-" * 70)
    for i, plan in enumerate(rename_plan[:10], 1):
        print(f"{i}. {plan['old_name']}")
        print(f"   → {plan['new_name']}")

    if len(rename_plan) > 10:
        print(f"   ... and {len(rename_plan) - 10} more")

    # Auto-confirm (user requested immediate cleanup)
    print("\n" + "=" * 70)
    print(f"✅ Auto-confirmed: Renaming {len(rename_plan)} folders...")
    print("=" * 70)

    # Execute renames
    print("\n🔄 Renaming folders...")
    print("=" * 70)

    success_count = 0
    error_count = 0

    for i, plan in enumerate(rename_plan, 1):
        print(f"\n[{i}/{len(rename_plan)}]")
        success, message = rename_folder(plan["old_path"], plan["new_name"])

        if success:
            success_count += 1
            print(f"  ✅ {message}")
        else:
            error_count += 1
            print(f"  ❌ Error: {message}")

    print("\n" + "=" * 70)
    print(f"✅ Cleanup Complete!")
    print(f"   Renamed: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Total: {len(rename_plan)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
