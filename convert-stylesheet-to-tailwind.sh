#!/bin/bash

# Script to convert all StyleSheet.create() usages to TailwindCSS in web/src/components/
# This script will process all 57 files that still use StyleSheet

# List of files to convert (from grep output)
FILES=(
  "web/src/components/admin/HierarchicalContentTable.tsx"
  "web/src/components/widgets/WidgetContainer.tsx"
  "web/src/components/widgets/WidgetFormModal.tsx"
  "web/src/components/settings/AISettings.tsx"
  "web/src/components/settings/RitualSettings.tsx"
  "web/src/components/settings/voice/VoiceSettingsMain.tsx"
  "web/src/components/player/SettingsPanel.tsx"
  "web/src/components/player/SubtitleControls.tsx"
  "web/src/components/player/VideoPlayer.tsx"
  "web/src/components/recordings/RecordingCard.tsx"
  "web/src/components/player/ChapterTimeline.tsx"
  "web/src/components/player/PlayerControls.tsx"
  "web/src/components/layout/Footer.tsx"
  "web/src/components/layout/GlassSidebar.tsx"
  "web/src/components/layout/Header.tsx"
  "web/src/components/layout/Layout.tsx"
  "web/src/components/layouts/VerticalFeed.tsx"
  "web/src/components/flow/RunningFlowBanner.tsx"
  "web/src/components/epg/EPGRecordModal.tsx"
  "web/src/components/chess/PlayerCard.tsx"
  "web/src/components/content/ContentCard.tsx"
  "web/src/components/content/ContentCarousel.tsx"
  "web/src/components/content/HeroSection.tsx"
  "web/src/components/content/SoundwaveParticles.tsx"
  "web/src/components/chat/Chatbot.tsx"
  "web/src/components/chat/ChatRecommendations.tsx"
  "web/src/components/chat/ChatSuggestionsPanel.tsx"
  "web/src/components/chess/ChessBoard.tsx"
  "web/src/components/chess/ChessChat.tsx"
  "web/src/components/chess/ChessControls.tsx"
  "web/src/components/chess/CreateGameModal.tsx"
  "web/src/components/chess/JoinGameModal.tsx"
  "web/src/components/chess/MoveHistory.tsx"
  "web/src/components/admin/queue/components/QueuedItemsList.tsx"
  "web/src/components/admin/queue/components/QueuePausedWarning.tsx"
  "web/src/components/admin/queue/components/RecentCompletedList.tsx"
  "web/src/components/admin/queue/components/StageError.tsx"
  "web/src/components/admin/queue/components/StageIndicator.tsx"
  "web/src/components/admin/queue/components/StageTooltip.tsx"
  "web/src/components/chat/ChatInputBar.tsx"
  "web/src/components/chat/ChatMessageList.tsx"
  "web/src/components/admin/queue/components/ActiveJobCard.tsx"
  "web/src/components/admin/queue/components/QueueHeader.tsx"
  "web/src/components/admin/queue/GlassQueue.tsx"
  "web/src/components/admin/ImageUploader.tsx"
  "web/src/components/admin/LibrarianActivityLog.tsx"
  "web/src/components/admin/LibrarianScheduleCard.tsx"
  "web/src/components/admin/AdminLayout.tsx"
  "web/src/components/admin/AdminSidebar.tsx"
  "web/src/components/admin/CategoryPicker.tsx"
  "web/src/components/admin/DataTable.tsx"
  "web/src/components/admin/FreeContentImportWizard.tsx"
  "web/src/components/FocusableWrapper.tsx"
)

echo "Starting conversion of ${#FILES[@]} files from StyleSheet to TailwindCSS..."
echo "Note: This is an automated conversion. Manual review is recommended."
echo ""

for file in "${FILES[@]}"; do
  filepath="/Users/olorin/Documents/olorin/olorin-media/bayit-plus/$file"

  if [ ! -f "$filepath" ]; then
    echo "⚠️  File not found: $file"
    continue
  fi

  echo "Processing: $file"

  # Create backup
  cp "$filepath" "${filepath}.backup"

  # Remove StyleSheet import
  sed -i '' 's/, StyleSheet//' "$filepath"
  sed -i '' 's/StyleSheet, //' "$filepath"
  sed -i '' 's/import { StyleSheet }//' "$filepath"

  # Remove spacing and borderRadius imports where they exist
  sed -i '' 's/, spacing, borderRadius/ /' "$filepath"
  sed -i '' 's/, borderRadius, spacing/ /' "$filepath"
  sed -i '' 's/, spacing/ /' "$filepath"
  sed -i '' 's/, borderRadius/ /' "$filepath"

  # Remove the entire StyleSheet.create({}) block
  # This is complex, so we'll mark it for manual review
  echo "  ⚠️  Manual conversion needed for StyleSheet.create() block and style props"

done

echo ""
echo "✓ Conversion complete!"
echo "Note: You must manually convert:"
echo "  1. All style={styles.xyz} to className=\"...\""
echo "  2. Remove the StyleSheet.create({}) blocks"
echo "  3. Review and test each file"
echo ""
echo "Backups saved with .backup extension"
