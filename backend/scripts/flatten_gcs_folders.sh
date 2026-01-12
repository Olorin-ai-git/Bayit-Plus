#!/bin/bash
# Flatten nested GCS movie folders
# Moves files from movies/cleaned_folder/old_folder/file.mp4 to movies/cleaned_folder/file.mp4

BUCKET="gs://bayit-plus-media-new/movies/"

echo "Finding nested folders..."

# Get all top-level folders
for parent_folder in $(gsutil ls "$BUCKET"); do
    folder_name=$(basename "$parent_folder")
    echo "Checking $folder_name..."

    # Check if this folder has subfolders (nested structure)
    subfolders=$(gsutil ls "$parent_folder" | grep '/$' || true)

    if [ -n "$subfolders" ]; then
        echo "  Found nested structure in $folder_name"

        # For each subfolder, move all video files up one level
        for subfolder in $subfolders; do
            subfolder_name=$(basename "$subfolder")
            echo "    Moving files from $subfolder_name..."

            # Find all video files in the subfolder
            files=$(gsutil ls -r "$subfolder" | grep -E '\.(mkv|mp4|avi)$' || true)

            for file in $files; do
                filename=$(basename "$file")
                destination="${parent_folder}${filename}"

                echo "      Moving $filename"
                gsutil mv "$file" "$destination"
            done

            # Remove the now-empty subfolder
            echo "    Removing empty subfolder $subfolder_name..."
            gsutil rm -r "$subfolder" || true
        done
    fi
done

echo "Flattening complete!"
