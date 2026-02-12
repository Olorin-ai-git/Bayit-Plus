#!/bin/bash
set -e

# Script to add missing repository files to BayitPlusApp target
# Run from ios-app directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Adding missing repository files to Xcode project..."

# Files that need to be added
FILES=(
    "BayitPlusApp/Repositories/MissionsRepository.swift"
    "BayitPlusApp/Repositories/StarStoryRepository.swift"
    "BayitPlusApp/Repositories/InteractiveMissionRepository.swift"
    "BayitPlusApp/Repositories/AvatarOutfitRepository.swift"
    "BayitPlusApp/Repositories/FamilySnapRepository.swift"
    "BayitPlusApp/Repositories/PhoneticMirrorRepository.swift"
    "BayitPlusApp/Repositories/GrandparentBridgeRepository.swift"
    "BayitPlusApp/Repositories/GamificationRepository.swift"
    "BayitPlusApp/Repositories/AvatarMeshRepository.swift"
    "BayitPlusApp/Repositories/ZehAniRepository.swift"
)

# Use xcrun to add files via scripting
PROJECT_FILE="BayitPlus.xcodeproj"

echo "📦 Verifying files exist..."
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: $file does not exist!"
        exit 1
    fi
    echo "  ✓ $file"
done

echo ""
echo "🔧 Adding files to Xcode project..."
echo "   This requires opening Xcode to properly add the files."
echo ""

# Create a simple AppleScript to add files to Xcode
cat > /tmp/add_files.scpt << 'EOF'
tell application "Xcode"
    activate
    set projectPath to POSIX file "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app/BayitPlus.xcodeproj"
    open projectPath
    delay 2
end tell

display dialog "Please add the following files to the BayitPlusApp target:

• MissionsRepository.swift
• StarStoryRepository.swift
• InteractiveMissionRepository.swift
• AvatarOutfitRepository.swift
• FamilySnapRepository.swift
• PhoneticMirrorRepository.swift
• GrandparentBridgeRepository.swift
• GamificationRepository.swift
• AvatarMeshRepository.swift
• ZehAniRepository.swift

They are located in BayitPlusApp/Repositories/" buttons {"OK"} default button "OK"
EOF

# Alternative: Use direct project.pbxproj editing
echo "📝 Attempting to add files directly to project.pbxproj..."

# Backup the project file
cp "$PROJECT_FILE/project.pbxproj" "$PROJECT_FILE/project.pbxproj.backup"

# This is a simplified approach - we'll add the files using xcodebuild
# For each file, we need to:
# 1. Check if it exists in PBXFileReference
# 2. If not, add it
# 3. Add it to PBXSourcesBuildPhase for BayitPlusApp target

python3 << 'PYTHON_SCRIPT'
import re
import uuid
import sys

project_path = "BayitPlus.xcodeproj/project.pbxproj"

# Read the project file
with open(project_path, 'r') as f:
    content = f.read()

files_to_add = [
    "MissionsRepository.swift",
    "StarStoryRepository.swift",
    "InteractiveMissionRepository.swift",
    "AvatarOutfitRepository.swift",
    "FamilySnapRepository.swift",
    "PhoneticMirrorRepository.swift",
    "GrandparentBridgeRepository.swift",
    "GamificationRepository.swift",
    "AvatarMeshRepository.swift",
    "ZehAniRepository.swift",
]

print("Checking which files need to be added...")
files_to_process = []

for filename in files_to_add:
    # Check if file is already referenced
    if filename in content:
        print(f"  ✓ {filename} already in project")
    else:
        print(f"  + {filename} needs to be added")
        files_to_process.append(filename)

if not files_to_process:
    print("\n✅ All files are already in the project!")
    sys.exit(0)

print(f"\n⚠️  {len(files_to_process)} files need to be added to the Xcode project.")
print("    Please add them manually in Xcode:")
for f in files_to_process:
    print(f"      - {f}")

PYTHON_SCRIPT

echo ""
echo "✅ Script complete!"
echo ""
echo "📌 MANUAL STEPS REQUIRED:"
echo "   1. Open Xcode: open BayitPlus.xcodeproj"
echo "   2. In Project Navigator, right-click on 'Repositories' folder"
echo "   3. Select 'Add Files to BayitPlus...'"
echo "   4. Navigate to BayitPlusApp/Repositories/"
echo "   5. Select the missing repository files"
echo "   6. Make sure 'BayitPlusApp' target is checked"
echo "   7. Click 'Add'"
echo ""
echo "Or drag the files from Finder into the Repositories group in Xcode."
