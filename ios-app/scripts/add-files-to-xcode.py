#!/usr/bin/env python3
"""
Add missing repository files to Xcode project
"""
import re
import sys

project_file = "BayitPlus.xcodeproj/project.pbxproj"

# Read the project file
with open(project_file, 'r') as f:
    content = f.read()

# Files to add
files_to_add = [
    ("MissionsRepository.swift", "BayitPlusApp/Repositories"),
    ("StarStoryRepository.swift", "BayitPlusApp/Repositories"),
    ("InteractiveMissionRepository.swift", "BayitPlusApp/Repositories"),
    ("AvatarOutfitRepository.swift", "BayitPlusApp/Repositories"),
    ("FamilySnapRepository.swift", "BayitPlusApp/Repositories"),
    ("PhoneticMirrorRepository.swift", "BayitPlusApp/Repositories"),
    ("GrandparentBridgeRepository.swift", "BayitPlusApp/Repositories"),
    ("GamificationRepository.swift", "BayitPlusApp/Repositories"),
    ("AvatarMeshRepository.swift", "BayitPlusApp/Repositories"),
    ("ZehAniRepository.swift", "BayitPlusApp/Repositories"),
]

# Find an existing repository file reference to use as a template
existing_pattern = r'\/\* AudiobookRepository\.swift \*\/ = \{isa = PBXFileReference; .*? path = AudiobookRepository\.swift; sourceTree = "<group>"; \};'
match = re.search(existing_pattern, content, re.DOTALL)

if not match:
    print("❌ Could not find template file reference")
    print("Please add files manually in Xcode:")
    print("1. Open BayitPlus.xcodeproj")
    print("2. Select all 10 repository files in Finder")
    print("3. Drag them into the Repositories group in Xcode")
    print("4. Make sure 'Copy items if needed' is UNCHECKED")
    print("5. Make sure 'BayitPlusApp' target is CHECKED")
    sys.exit(1)

print(f"✅ Found template: {match.group(0)[:100]}...")
print("\n⚠️  Direct project file editing is complex and risky.")
print("    It's safer to add files manually in Xcode.\n")

print("🔧 TO ADD FILES MANUALLY:")
print("="*60)
print("1. Close Xcode if it's open")
print("2. In Finder, navigate to:")
print("   ios-app/BayitPlusApp/Repositories/")
print("3. Select these 10 files (Cmd+Click):")
for filename, _ in files_to_add:
    print(f"   • {filename}")
print("\n4. Open: ios-app/BayitPlus.xcodeproj")
print("5. In Xcode Project Navigator, find 'Repositories' folder")
print("6. Drag the 10 selected files from Finder into")
print("   the Repositories folder in Xcode")
print("7. In the dialog that appears:")
print("   ✓ UNCHECK 'Copy items if needed'")
print("   ✓ CHECK 'BayitPlusApp' under 'Add to targets'")
print("   ✓ Click 'Finish'")
print("="*60)
