#!/bin/bash
# Migrate StyleSheet to TailwindCSS for all admin screens

DIR="/Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/screens/admin"

for file in "$DIR"/*.tsx; do
    echo "Processing: $(basename "$file")"

    # Remove StyleSheet from imports
    sed -i '' 's/, StyleSheet//g' "$file"
    sed -i '' 's/StyleSheet, //g' "$file"
    sed -i '' '/^import.*StyleSheet.*from/d' "$file"

    # Convert common style patterns to className
    sed -i '' 's/style={styles\.container}/className="flex-1 p-4"/g' "$file"
    sed -i '' 's/style={styles\.headerActions}/className="flex-row gap-2"/g' "$file"
    sed -i '' 's/style={styles\.filterButton}/className="flex-row items-center px-3 py-2 bg-black\/20 backdrop-blur-xl rounded-md border border-white\/10"/g' "$file"
    sed -i '' 's/style={styles\.filterButtonIcon}/className="text-base mr-1"/g' "$file"
    sed -i '' 's/style={styles\.filterButtonText}/className="text-sm text-white"/g' "$file"
    sed -i '' 's/style={styles\.actionsRow}/className="flex-row gap-1"/g' "$file"
    sed -i '' 's/style={styles\.actionButton}/className="w-[30px] h-[30px] rounded-sm bg-gray-800 justify-center items-center"/g' "$file"
    sed -i '' 's/style={styles\.actionIcon}/className="text-sm"/g' "$file"
    sed -i '' 's/style={styles\.modalOverlay}/className="flex-1 bg-black\/50 justify-center items-center"/g' "$file"
    sed -i '' 's/style={styles\.modalContent}/className="w-[90%] max-w-[500px] bg-gray-900\/95 rounded-lg p-4 border border-white\/10"/g' "$file"
    sed -i '' 's/style={styles\.modalTitle}/className="text-xl font-bold text-white mb-4"/g' "$file"
    sed -i '' 's/style={styles\.formGroup}/className="mb-3"/g' "$file"
    sed -i '' 's/style={styles\.formLabel}/className="text-sm font-semibold text-white mb-1"/g' "$file"
    sed -i '' 's/style={styles\.formInput}/className="bg-gray-800 rounded-md border border-white\/10 px-3 py-2 text-white text-base"/g' "$file"

    # Remove StyleSheet.create block (everything from "const styles = " to the matching });)
    # This is complex in sed, so we'll handle it differently

    echo "  ✓ Partial migration complete for $(basename "$file")"
done

echo "Migration complete. Please review files and remove StyleSheet.create blocks manually."
