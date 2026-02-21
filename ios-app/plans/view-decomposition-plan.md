# View Decomposition Plan

## Goal

Decompose 7 large SwiftUI view files into sub-200-line files using extracted subviews and extensions.

## 1. VODView.swift (646 lines)

- **VODView.swift** (~190 lines): Main view struct with body, data loading, navigation
- **VODFilterViews.swift** (~75 lines): contentTypeFilters, categoryFilters, genreFilters, FilterPill struct
- **VODCard.swift** (~195 lines): VODCard struct (poster, badges, subtitle info)
- **VODTrendingSection.swift** (~120 lines): trendingSection, aiCollectionsSection, TrendingContentCard, AICollectionCard structs

## 2. PiPWidgetContainerView.swift (627 lines)

- **PiPWidgetContainerView.swift** (~65 lines): Main container with body, gesture, video state
- **PiPWidgetControls.swift** (~100 lines): headerBar, controlButtons, headerButton, titleSection, playButtonOverlay, compactTransportControls
- **PiPWidgetContent.swift** (~175 lines): contentArea, contentHeight, all content type views (live, radio, podcast, vod, audiobook, iframe, custom, placeholder), cover image helpers
- **InlineAVPlayerLayerView.swift** (~30 lines): UIViewRepresentable for AVPlayerLayer

## 3. AISubtitlesPickerView.swift (574 lines)

- **AISubtitlesPickerView.swift** (~130 lines): Main view struct with body, mode options data, onAppear logic
- **AISubtitlesGridView.swift** (~120 lines): modeOptionRow, generateButton, generationProgressView, unavailableBadge
- **AISubtitlesSettings.swift** (~190 lines): Helper methods (isModeAvailable, checkFirstTimeHint, checkActiveJobs, handleActiveJob, handleGenerateMode, startPolling, handleCancelJob), banners, supporting types

## 4. TVLoginView.swift (465 lines)

- **TVLoginView.swift** (~95 lines): Main view struct with body, status router, loading section
- **TVLoginCodeEntry.swift** (~120 lines): connectedSection, authenticatingSection, errorSection, expiredSection
- **TVLoginQRDisplay.swift** (~100 lines): headerSection, successSection, API methods (verifyAndConnect, verifySession, notifyConnection, completeAuthentication), response models, status enum

Actually, TVLogin has no QR/code entry in this direction. Renaming:

- **TVLoginStatusSections.swift** (~140 lines): connected, authenticating, error, expired, success sections
- **TVLoginNetworking.swift** (~130 lines): API methods + response models + status enum

## 5. PauseAskDialogueOverlayView.swift (427 lines)

- **PauseAskDialogueOverlayView.swift** (~80 lines): Main struct with body, phase router, state properties
- **PauseAskConversationView.swift** (~135 lines): videoPlaybackView, userCircle, characterCircle, stillImage, idlePanel, progressView
- **PauseAskInputView.swift** (~50 lines): inputPanel, inputHeader
- **PauseAskDialogueOverlayView+Actions.swift** (~165 lines): selectCharacter, sendQuestion, playUserVideo, playCharacterVideo, cleanupUserPlayer, cleanupCharacterPlayer

## 6. SubtitleLanguagePickerView.swift (417 lines)

- **SubtitleLanguagePickerView.swift** (~150 lines): Main view struct with body, PickerItem, pickerItems computed, helpers
- **SubtitleLanguageList.swift** (~120 lines): offRow, languageRow, handleItemTap, splitRow
- **SubtitleDownloadSection.swift** (~35 lines): rowBackground, helper methods (isItemSelected, isItemAvailable, hebrewModeAvailable, englishModeAvailable, dismissPicker), ModeSelectionItem type

## 7. SeriesDetailView.swift (409 lines)

- **SeriesDetailView.swift** (~100 lines): Main view struct with body, detailContent, loadingState
- **SeriesDetailHeader.swift** (~120 lines): backdropSection, backdropImage, metadataSection, genreChips, aiLanguages, favoriteButton
- **SeriesEpisodeList.swift** (~115 lines): seasonPicker, episodeList, EpisodeRow struct
