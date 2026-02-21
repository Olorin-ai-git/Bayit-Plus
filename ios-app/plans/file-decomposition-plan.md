# File Decomposition Plan - iOS App 200-Line Limit

## Summary

Decompose 10 files that exceed 200 lines into smaller focused files.

## Files and Strategy

### 1. OnboardingAIView.swift (397 lines)

- **OnboardingAISteps.swift**: Extract welcomeStep, contentTasteStep, voiceSetupStep, profileCreationStep, genreGrid, avatarPicker
- **OnboardingAIProgress.swift**: Extract progressIndicator, navigationButtons, preferenceRow, togglePreference
- **OnboardingAIView.swift**: Keep main view body with stepContent dispatch (~70 lines)

### 2. CreateWidgetView.swift (376 lines)

- **CreateWidgetFormSections.swift**: Extract titleSection, contentTypeSection, iframeFields, vodContentIdField
- **CreateWidgetContentPicker.swift**: Extract pickerSection, selectedContentCard, contentPlaceholder
- **CreateWidgetView.swift**: Keep main view body, validation, save, helpers (~130 lines)

### 3. HomeViewModel.swift (366 lines > actually 390 with types)

- **HomeViewModel+ContentLoading.swift**: Extract all load\* methods (loadLiveChannels, loadRadioStations, loadFeaturedCollections, loadContinueWatching, loadTelAvivContent, loadJerusalemContent, loadTrending, loadLocationContent, loadIsraelisInCity, loadIsraeliBusinesses, loadYoungstersTrending, loadCultureCities)
- **HomeViewModel.swift**: Keep properties, init, loadFeatured, refresh, loadAdditionalSections, helpers (~160 lines)

### 4. ConnectedAccountsView.swift (350 lines)

- **ConnectedAccountRow.swift**: Extract linkedProviderRow, emptyState, linkProviderButton, sectionHeader
- **ConnectedAccountsActions.swift**: Extract loadLinkedProviders, linkGoogle, linkApple, unlinkProvider
- **ConnectedAccountsView.swift**: Keep main view body, computed properties (~110 lines)

### 5. AvatarModeView.swift (348 lines)

- **AvatarModeVisualization.swift**: Extract avatarVisualization, outerRing, middleRing, innerOrb, stateIcon, computed color/size properties
- **AvatarModeConversation.swift**: Extract conversationArea, dialogueBubble, typingIndicator, voiceInputBar
- **AvatarModeView.swift**: Keep main body, topBar, backgroundGradient (~70 lines)

### 6. HeroCarousel.swift (335 lines)

- **HeroCarouselItem.swift**: Extract heroImage, heroPlaceholder, heroMetadata, metadataText, ratingBadge, heroActions
- **HeroCarousel.swift**: Keep main body, navigation, auto-rotation, actions (~170 lines)

### 7. DownloadManager.swift (334 lines)

- **DownloadManager+TaskManagement.swift**: Extract URLSessionDownloadDelegate, AVAssetDownloadDelegate, task registry, file helpers
- **DownloadManager.swift**: Keep class definition, public API methods (~170 lines)

### 8. ContentRepository.swift (318 lines)

- **ContentRepositoryProtocol.swift**: Extract protocol definition with all doc comments (~135 lines)
- **ContentRepository.swift**: Keep APIContentRepository implementation (~180 lines, renamed from ContentRepository.swift)

### 9. MovieDetailView.swift (319 lines)

- **MovieDetailSections.swift**: Extract backdropSection, metadataSection, actionButtons, genreChips, castSection, relatedSection, helper functions
- **MovieDetailView.swift**: Keep main view body, task, fullScreenCover, detailContent (~80 lines)

### 10. VoiceAssistantSheet.swift (316 lines)

- **VoiceAssistantConversation.swift**: Extract conversationArea, voiceButton, voiceOrb, stateIcon, computed properties
- **VoiceAssistantSheet.swift**: Keep main body, header, actions (~130 lines)
