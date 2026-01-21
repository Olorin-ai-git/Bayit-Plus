#!/bin/bash
# Clean Local Movie Folder Names
# Usage: ./clean_local_movie_folders.sh /path/to/USB-Drive/Movies

if [ -z "$1" ]; then
    echo "Usage: $0 <path-to-movies-folder>"
    echo "Example: $0 /Volumes/USB-Drive/Movies"
    exit 1
fi

MOVIES_DIR="$1"

if [ ! -d "$MOVIES_DIR" ]; then
    echo "❌ Error: Directory not found: $MOVIES_DIR"
    exit 1
fi

echo "🧹 Cleaning Local Movie Folders..."
echo "Directory: $MOVIES_DIR"
echo "======================================"

cd "$MOVIES_DIR" || exit 1

count=0

# Find all directories and clean their names
for old_name in */; do
    # Remove trailing slash
    old_name="${old_name%/}"

    # Start with the original name
    new_name="$old_name"

    # Replace underscores with spaces
    new_name="${new_name//_/ }"

    # Remove common junk patterns
    new_name=$(echo "$new_name" | sed -E '
        s/\b(1080p|720p|480p|360p|4K|2160p|HDRip|WEBRip|BluRay|BRRip|DVDRip)//gi
        s/\bWEB-?DL\b//gi
        s/\[YTS\.MX\]//gi
        s/\[YTS\]//gi
        s/\[YIFY\]//gi
        s/\[RARBG\]//gi
        s/\[MX\]//gi
        s/\(.*\)//g
        s/\b(YIFY|YTS|RARBG|BOKUTOX|BOKUT|MDMA|BoK|GAZ|EVO|juggs)//gi
        s/\b(XviD|XViD|x264|h264|h265|HEVC|AAC|AC3|DTS)//gi
        s/\b(WEB|LINE|R5|CAM|TS|TC|Rip)//gi
        s/\b(TV|com|cd1|Eng|Sample)//gi
        s/\bp\b//gi
        s/- MX//gi
        s/- hV//gi
        s/- AMIABLE//gi
        s/- Sample//gi
        s/- EVO//gi
        s/  +/ /g
        s/ - $//
        s/^ - //
    ')

    # Trim whitespace
    new_name=$(echo "$new_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Replace spaces back with underscores for folder name
    new_name="${new_name// /_}"

    # Only rename if different
    if [ "$old_name" != "$new_name" ] && [ -n "$new_name" ]; then
        ((count++))
        echo ""
        echo "[$count] $old_name"
        echo "    → $new_name"

        mv "$old_name" "$new_name" 2>&1

        if [ $? -eq 0 ]; then
            echo "✅ Renamed"
        else
            echo "❌ Failed to rename"
        fi
    fi
done

echo ""
echo "======================================"
echo "✅ Cleanup complete! Renamed $count folders"
