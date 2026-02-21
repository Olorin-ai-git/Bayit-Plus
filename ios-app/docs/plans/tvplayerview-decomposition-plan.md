# TVPlayerView Decomposition Plan

## Current State

- `TVPlayerView.swift`: 1,447 lines -- needs to be under 200 lines each file

## Extraction Strategy

### 1. `TVPlayerStateContainer.swift` (~130 lines)

An `@Observable` class grouping all 30+ `@State` properties into logical sections:

- ViewModels (subtitlesVM, liveDubbingVM, liveSubtitlesVM, triviaVM, etc.)
- Panel visibility flags (showSubtitleLanguagePicker, showDubbingControls, etc.)
- Playback state (selectedSubtitleLanguage, playbackSpeed, audioTracks, etc.)
- Split subtitle state
- Interaction/dialogue state
- Chapter navigation state

### 2. `TVPlayerView+TransportControls.swift` (~180 lines)

Extension containing:

- `playbackControlsOverlay` computed property
- `resetOverlayTimer()` method
- `startOver()` method
- `playerProgressBar` computed property
- `progressFraction`, `bufferedFraction` computed properties
- `formatTime(_:)` helper
- Interaction navigation (previousInteractionAction, nextInteractionAction, sortedMoments)

### 3. `TVPlayerView+MetadataOverlay.swift` (~180 lines)

Extension containing:

- `subtitleOverlay` (VOD subtitles)
- `subtitleText(_:)` helper
- `liveSubtitleOverlay`
- `splitSubtitleOverlay`
- `translationOverlay`
- `catchUpAutoPromptOverlay`
- `triviaOverlay`
- `streamLoadingView`
- `streamErrorView(_:)`
- `noAvatarWarningBanner`

### 4. `TVPlayerView+InteractionOverlays.swift` (~180 lines)

Extension containing:

- `dialogueOverlay`
- `pauseAskOverlay`
- `interactiveMomentOverlay`
- `sharedInteractionOverlay`
- `openCharacterSelection()`, `startDialogue(with:)`, `dismissDialogue()`
- `startPauseAskInteraction()`, `dismissPauseAsk()`
- `duckVolume()`, `restoreVolume()`

### 5. `TVPlayerView+FocusManagement.swift` (~200 lines)

Extension containing:

- `resolveAndPlay()` + `fetchStreamURL()`
- `loadAvailableLanguages()`
- `initializeViewModels()`
- `initializeInteractiveMoments()`
- `cleanup()`
- `handleSubtitleSelection(_:)`
- `handleAILanguageChange(_:)`
- Live feature toggles (toggleLiveTranslation, toggleLiveDubbing, toggleLiveTrivia)
- Split subtitle helpers (activeModeLabel, loadSplitSubtitleCues)
- Progress tracking (loadResumePosition, startProgressTracking, saveProgress)
- Subtitle preferences (loadSubtitlePreference, saveSubtitlePreference)
- Chapter navigation (loadChapters, skipToPreviousChapter, skipToNextChapter)

Note: FocusManagement is too large for 200 lines. Will split lifecycle/data methods into a separate file.

### Revised plan -- 6 files:

### 5. `TVPlayerView+Lifecycle.swift` (~180 lines)

- `resolveAndPlay()`, `fetchStreamURL()`
- `loadAvailableLanguages()`
- `initializeViewModels()`
- `initializeInteractiveMoments()`
- `cleanup()`
- Progress tracking methods
- Subtitle preference methods
- Chapter navigation methods

### 6. `TVPlayerView+FocusManagement.swift` (~130 lines)

- `handleSubtitleSelection(_:)`
- `handleAILanguageChange(_:)`
- Live feature toggles
- Split subtitle helpers

### 7. `TVPlayerView.swift` (coordinator, ~200 lines)

- Struct declaration with Environment properties
- Init
- Reference to `TVPlayerStateContainer`
- `body` property as coordinator referencing extracted subviews
- fullScreenCover modifiers

## File Count Summary

| File                                   | Est. Lines |
| -------------------------------------- | ---------- |
| TVPlayerStateContainer.swift           | ~130       |
| TVPlayerView+TransportControls.swift   | ~180       |
| TVPlayerView+MetadataOverlay.swift     | ~180       |
| TVPlayerView+InteractionOverlays.swift | ~180       |
| TVPlayerView+Lifecycle.swift           | ~180       |
| TVPlayerView+FocusManagement.swift     | ~130       |
| TVPlayerView.swift (coordinator)       | ~200       |
| **Total**                              | ~1,180     |
