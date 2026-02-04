#!/bin/bash

# Script to copy Hermes dSYM to archive for App Store submission
# This fixes the "Upload Symbols Failed" error for hermesvm.framework

set -e

DSYM_FOLDER="${DWARF_DSYM_FOLDER_PATH}"
HERMES_FRAMEWORK_PATH="${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.framework"
HERMES_DSYM_PATH="${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.framework.dSYM"

echo "🔍 Checking for Hermes dSYM..."

# Check if we're doing an archive build (for App Store submission)
if [ "$CONFIGURATION" = "Release" ] && [ -n "$ARCHIVE_PATH" ]; then
  echo "📦 Archive build detected - copying Hermes dSYM"

  # Check if Hermes dSYM exists
  if [ -d "$HERMES_DSYM_PATH" ]; then
    # Create dSYMs folder in archive if it doesn't exist
    ARCHIVE_DSYMS_FOLDER="${ARCHIVE_PATH}/dSYMs"
    mkdir -p "$ARCHIVE_DSYMS_FOLDER"

    # Copy Hermes dSYM to archive
    echo "✅ Copying hermesvm.framework.dSYM to archive..."
    cp -R "$HERMES_DSYM_PATH" "$ARCHIVE_DSYMS_FOLDER/"

    echo "✅ Hermes dSYM copied successfully"
  else
    echo "⚠️  Warning: Hermes dSYM not found at $HERMES_DSYM_PATH"
    echo "ℹ️  Hermes dSYM may not be available for this configuration"
  fi
else
  echo "ℹ️  Skipping Hermes dSYM copy (not an archive build)"
fi

# Also check if we should copy to the standard build output
if [ -n "$DSYM_FOLDER" ] && [ -d "$HERMES_DSYM_PATH" ]; then
  echo "📋 Copying Hermes dSYM to build output..."
  cp -R "$HERMES_DSYM_PATH" "$DSYM_FOLDER/" || true
  echo "✅ Hermes dSYM copied to build output"
fi

echo "✅ Hermes dSYM script completed"
