#!/bin/bash
# Aggressive Local Movie Folder Cleanup
# Removes EVERYTHING in brackets and parentheses
# Usage: ./clean_local_aggressive.sh /path/to/USB-Drive/Movies

if [ -z "$1" ]; then
    echo "Usage: $0 <path-to-movies-folder>"
    echo "Example: $0 /Volumes/USB Drive/Movies"
    exit 1
fi

MOVIES_DIR="$1"

if [ ! -d "$MOVIES_DIR" ]; then
    echo "❌ Error: Directory not found: $MOVIES_DIR"
    exit 1
fi

echo "🧹 Aggressive Movie Folder Cleanup..."
echo "Directory: $MOVIES_DIR"
echo "======================================"

cd "$MOVIES_DIR" || exit 1

count=0

# Find all directories and clean their names aggressively
for old_name in */; do
    # Remove trailing slash
    old_name="${old_name%/}"

    # Start with the original name
    new_name="$old_name"

    # First, convert dots to spaces (for dot-separated filenames)
    new_name="${new_name//./ }"

    # Remove everything in parentheses
    new_name=$(echo "$new_name" | sed -E 's/\([^)]*\)//g')

    # Remove everything in square brackets
    new_name=$(echo "$new_name" | sed -E 's/\[[^]]*\]//g')

    # Remove everything in curly brackets
    new_name=$(echo "$new_name" | sed -E 's/\{[^}]*\}//g')

    # Replace underscores with spaces
    new_name="${new_name//_/ }"

    # Remove common junk patterns - multiple passes for better matching
    # Remove 4-digit years
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(19|20)[0-9][0-9][[:space:]]+/ /g')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(19|20)[0-9][0-9]$//g')

    # Remove file sizes
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+[0-9]+(MB|GB|mb|gb)[[:space:]]+/ /g')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+[0-9]+(MB|GB|mb|gb)$//g')

    # Remove quality markers (case insensitive)
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(1080p|720p|480p|360p|4K|2160p|1080P|720P|480P|360P)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(1080p|720p|480p|360p|4K|2160p|1080P|720P|480P|360P)$//gi')

    # Remove rip types
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(HDRip|WEBRip|BluRay|BRRip|DVDRip|BDRip|WEB-DL|WEBDL|DVDScr|HDCAM)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(HDRip|WEBRip|BluRay|BRRip|DVDRip|BDRip|WEB-DL|WEBDL|DVDScr|HDCAM)$//gi')

    # Remove codec info
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(XviD|XViD|x264|x265|h264|h265|HEVC|H264|H265|H_264|H_265|10bit|8bit)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(XviD|XViD|x264|x265|h264|h265|HEVC|H264|H265|H_264|H_265|10bit|8bit)$//gi')

    # Remove audio info
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(AAC|AAC5 1|AC3|DTS|DD5 1|DDPA5 1|HQ)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(AAC|AAC5 1|AC3|DTS|DD5 1|DDPA5 1|HQ)$//gi')

    # Remove streaming platforms
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(AMZN|NF|DSNP|HULU|HBO|iP)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(AMZN|NF|DSNP|HULU|HBO|iP)$//gi')

    # Remove file formats
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(MP3|MP4|AVI|MKV|WMV)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(MP3|MP4|AVI|MKV|WMV)$//gi')

    # Remove release types
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(SCREENER|UNRATED|LIMITED|REMASTERED|EXTENDED|DIRECTORS CUT)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(SCREENER|UNRATED|LIMITED|REMASTERED|EXTENDED)$//gi')

    # Remove release groups (specific names only, not generic dash-suffix)
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(YIFY|YTS|RARBG|GalaxyRG|GalaxyTV|BOKUTOX|EVO|ETHEL|FLUX|STRiFE|Will1869|Hive|CM8|VPPV|nickarad)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(YIFY|YTS|RARBG|GalaxyRG|GalaxyTV|BOKUTOX|EVO|ETHEL|FLUX|STRiFE|Will1869|Hive|CM8|VPPV|nickarad)$//gi')
    new_name=$(echo "$new_name" | sed -E 's/-_*(YIFY|YTS|RARBG|GalaxyRG|GalaxyTV|BOKUTOX|EVO|ETHEL|FLUX|STRiFE|Will1869|Hive|CM8|VPPV|nickarad)$//gi')

    # Remove other junk
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(WEB|S[0-9]+E[0-9]+|S[0-9]+|COMPLETE|Season|Episode|Pack|Atmos|Audiobook|Collection)[[:space:]]+/ /gi')
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(WEB|COMPLETE|Pack|Atmos|Audiobook|Collection)$//gi')

    # Remove episode numbers like "Episode IX" -> "IX"
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+Episode[[:space:]]+/ /gi')

    # Remove year ranges like "2002-2012"
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+(19|20)[0-9][0-9]-(19|20)[0-9][0-9][[:space:]]+/ /g')

    # Remove trailing junk characters like "+", "-" with spaces
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]*[+-][[:space:]]*$//')

    # Clean up extra spaces
    new_name=$(echo "$new_name" | sed -E 's/[[:space:]]+/ /g')
    new_name=$(echo "$new_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Trim whitespace
    new_name=$(echo "$new_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Replace spaces with underscores for folder name
    new_name="${new_name// /_}"

    # Remove trailing underscores and dots
    new_name=$(echo "$new_name" | sed 's/_*$//')
    new_name=$(echo "$new_name" | sed 's/\.*$//')

    # If empty, keep original
    if [ -z "$new_name" ] || [ ${#new_name} -lt 2 ]; then
        continue
    fi

    # Only rename if different
    if [ "$old_name" != "$new_name" ]; then
        ((count++))
        echo ""
        echo "[$count] $old_name"
        echo "    → $new_name"

        # Check if destination already exists
        if [ -d "$new_name" ]; then
            echo "⚠️  Destination exists, skipping"
            continue
        fi

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
