# PlayerView Decomposition Plan

## Current state

- `PlayerView.swift`: 1,145 lines (limit is 200)
- Existing extensions (DO NOT MODIFY):
  - `PlayerView+AIControls.swift` (199 lines) - AI features panel, toggle logic
  - `PlayerView+LiveFeatures.swift` (249 lines) - catch-up, scene search, chat, stream limit overlays, live feature buttons
  - `PlayerView+SplitSubtitles.swift` (63 lines) - split subtitle toggle and cue loading
  - `PlayerView+VODInteractions.swift` (245 lines) - VOD interactive moments, dialogue, pause-ask, shared interactions

## New files to create

### 1. `PlayerStateContainer.swift` (~160 lines)

An `@Observable` class grouping the 30+ `@State` properties into logical sub-groups.
Sub-groups:

- **Controls state**: showControls, controlsTimer, playerWidth
- **Subtitle state**: showSubtitlePicker, selectedSubtitleLanguage, subtitleLoadTask, subtitlesVM, splitModeEnabled, splitLanguages, showSplitLanguagePicker, splitLayout, primarySubtitleCues, secondarySubtitleCues
- **Recording state**: isRecording, recordingSessionId, recordingStartTime, recordingDuration, recordingTimer, showRecordingError, recordingErrorMessage
- **Live features state**: showCatchUp, showSceneSearch, showChannelChat, showAICompanion, showStreamLimitExceeded, streamLimitMaxStreams, streamLimitDevices
- **AI panel state**: showAIPanel, selectedAILanguage, showAILanguagePicker, selectedSecondaryLanguage
- **VOD interaction state**: avatarImageUrl, resolvedAvatarId, showNoAvatarWarning, volumeBeforeDuck
- **Dialogue state**: showCharacterSheet, showDialogueOverlay, showPauseAskOverlay, hasVoiceClone
- **Shared interaction state**: showSharedInteraction
- **PiP state**: isPiPActive
- **Quality/rate state**: showQualitySelector, showPlaybackRateMenu
- **Dubbing state**: showDubbingControls, isDubbingEnabled

NOTE: On reflection, using `@Observable` for this grouping introduces a major refactor since all the existing extension files reference these properties via `self.propertyName` on PlayerView. Moving to a container means updating EVERY extension file which we were told not to modify.

REVISED APPROACH: Keep `@State` properties on `PlayerView` itself. Instead, focus on extracting VIEW METHODS and HELPER METHODS into extensions. This preserves the existing pattern and avoids modifying the untouchable extension files.

### Revised extraction targets:

### 1. `PlayerView+TransportControls.swift` (~180 lines)

Extract from PlayerView:

- `controlsOverlay` computed property (lines 565-592)
- `topBar` computed property (lines 594-739) -- this is the largest single piece
- `controlsGradient` computed property (lines 741-756)
- `toggleControls()` method (lines 973-978)
- `scheduleControlsHide()` method (lines 980-992)
- `doubleTapSkipGesture` computed property (lines 1100-1110)

### 2. `PlayerView+MetadataOverlay.swift` (~170 lines)

Extract from PlayerView:

- `subtitlePickerOverlay` computed property (lines 469-532)
- `loadingOverlay` computed property (lines 536-541)
- `errorOverlay(_:)` method (lines 545-561)
- `liveOverlayBottomInset` computed property (lines 762-768)
- `availableSubtitleLanguages` computed property (lines 830-832)
- `aiSubtitleLanguages` computed property (lines 834-844)
- `handleSubtitleSelection(_:)` method (lines 846-878)
- `updateNowPlaying()` method (lines 994-1010)

### 3. `PlayerView+RecordingOverlay.swift` (~120 lines)

Extract from PlayerView:

- `recordingButton` computed property (lines 772-800)
- `playerDownloadButton` computed property (lines 804-826)
- `startRecording()` method (lines 1014-1053)
- `stopRecording()` method (lines 1055-1071)
- `startRecordingTimer()` method (lines 1073-1084)
- `formatRecordingDuration(_:)` method (lines 1086-1096)

### 4. `PlayerView+OrientationHelper.swift` (~40 lines)

Extract from PlayerView:

- `requestLandscapeOrientation()` method (lines 1116-1122)
- `restorePortraitOrientation()` method (lines 1124-1129)

### 5. `PlayerView+Helpers.swift` (~60 lines)

Extract from PlayerView:

- `mediaContentType` computed property (lines 939-947)
- `sortedMoments` computed property (lines 949-951)
- `previousInteractionAction` computed property (lines 953-961)
- `nextInteractionAction` computed property (lines 963-971)
- `playbackRateLabel` computed property (lines 1131-1136)
- `initializeViewModels()` method (lines 880-935)

### 6. PlayerView.swift (coordinator, ~195 lines)

Keeps:

- struct declaration with ALL stored properties (@State, @Environment, lets)
- init()
- body property composing extracted subviews (ZStack + modifiers)
- PlayerWidthKey PreferenceKey

## Execution order

1. Create new extension files (1-5 above)
2. Remove extracted code from PlayerView.swift
3. Verify line counts
