# Decomposition Plan: iOS Files Under 200 Lines

## Analysis Summary

After reading all 20 files, here is the decomposition plan for each.
Files already under 200 lines or very close will be noted.

### Files Requiring Decomposition (over 200 lines)

1. **FeatureValidationService.swift** (265 lines)
   - Extract: `AnyCodable` + `EmptyBody` into `FeatureValidationModels.swift`
   - Extract: `FeatureName`, `ValidationResult`, `BatchValidationRequest/Response`,
     `DeductCreditRequest/Response` into `FeatureValidationModels.swift`

2. **NotificationSettingsView.swift** (262 lines)
   - Extract: topic toggle row, error banner, data loading into
     `NotificationSettingsView+Sections.swift`

3. **WakeWordSettingsView.swift** (257 lines)
   - Extract: sensitivity/status/test sections into
     `WakeWordSettingsView+Sections.swift`

4. **PlaylistView.swift** (256 lines)
   - Extract: `PlaylistItemRow` (playlistRow + thumbnailView) into
     `PlaylistItemRow.swift`

5. **AvatarPreferencesView.swift** (256 lines)
   - Extract: style/voice/personality sections into
     `AvatarPreferencesView+Sections.swift`

6. **DeepLinkRouter.swift** (255 lines)
   - Extract: route parsing switch cases into
     `DeepLinkRouter+RouteParsing.swift`

7. **AvatarDialogueViewModel.swift** (254 lines)
   - Extract: message handling (sendMessage, sendPauseAskMessage,
     sendMultiCharacterMessage) into
     `AvatarDialogueViewModel+Messaging.swift`

8. **SplitSubtitleLanguagePickerView.swift** (253 lines)
   - Extract: `SplitModeToggleView`, `LanguageInfo`, `getLanguageInfo`
     into `SplitSubtitleLanguagePickerHelpers.swift`

9. **VODViewModel.swift** (253 lines)
   - Extract: data loading (loadMore, refresh) into
     `VODViewModel+DataLoading.swift`

10. **AvatarViewModel.swift** (252 lines)
    - Extract: speech recognition methods into
      `AvatarViewModel+SpeechRecognition.swift`

11. **CarPlayContentProvider.swift** (252 lines)
    - Extract: tab builders (audiobook, liveTV, podcast episodes)
      into `CarPlayContentProvider+Tabs.swift`

12. **TrendingRow.swift** (250 lines)
    - Extract: `TrendingTopicCard` into `TrendingTopicCard.swift`

13. **PlayerView+LiveFeatures.swift** (249 lines)
    - Extract: toolbar buttons into
      `PlayerView+LiveFeatureButtons.swift`

14. **RewardsView.swift** (247 lines)
    - Extract: badge collection + celebration into
      `RewardsView+Badges.swift`

15. **PlayerView+VODInteractions.swift** (247 lines)
    - Extract: initialization + dialogue management into
      `PlayerView+VODInteractionSetup.swift`

16. **ProfileSelectionView.swift** (246 lines)
    - Extract: `ProfileCardView` into `ProfileCardView.swift`

17. **CategoryModels.swift** (243 lines)
    - Extract: Flows + Morning Ritual models into
      `FlowModels.swift`

18. **ProfileAccountSections.swift** (242 lines)
    - Extract: menu section into `ProfileMenuSection.swift`

19. **WidgetPlayerViewModel.swift** (242 lines)
    - Extract: stream/cover resolution into
      `WidgetPlayerViewModel+StreamResolution.swift`

20. **MiniAudioPlayerBar.swift** (241 lines)
    - Extract: playback controls + progress bar into
      `MiniAudioPlayerBar+Controls.swift`

## Rules

- Each file must be under 200 lines
- Use `extension` pattern for splitting logic
- Use new structs for extracted subviews
- Preserve ALL functionality
- No emojis, no print()
