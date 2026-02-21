# View Decomposition Plan

## Goal

Decompose 8 iOS view/service files that exceed 200 lines into smaller files, each under 200 lines.

## File Breakdown

### 1. OnboardingAIView.swift (397 lines)

- **OnboardingAISteps.swift**: Extract welcomeStep, contentTasteStep, genreGrid, voiceSetupStep, profileCreationStep, avatarPicker (lines 79-294) as extension on OnboardingAIView
- **OnboardingAINavigation.swift**: Extract progressIndicator, navigationButtons, preferenceRow, togglePreference (lines 36-397) as extension on OnboardingAIView
- **OnboardingAIView.swift**: Keep struct definition, body, stepContent

### 2. CreateWidgetView.swift (376 lines)

- **CreateWidgetForm.swift**: Extract titleSection, contentTypeSection, contentIdSection, iframeFields, pickerSection, vodContentIdField, selectedContentCard, contentPlaceholder (lines 92-269) as extension on CreateWidgetView
- **CreateWidgetPreview.swift**: Extract validation (isFormValid), save(), syncPickerTab, errorBanner (lines 271-374) as extension on CreateWidgetView
- **CreateWidgetView.swift**: Keep struct definition, state, body

### 3. HomeViewModel.swift (366 lines -> actually 390 with supporting type)

- **HomeViewModel+DataLoading.swift**: Extract all private load\* methods (lines 136-352) as extension on HomeViewModel
- **HomeViewModel.swift**: Keep class definition, properties, init, loadFeatured, refresh, isCancellationError, CultureCityWithContent

### 4. ConnectedAccountsView.swift (350 lines)

- **ConnectedAccountRow.swift**: Extract linkedProviderRow, linkProviderButton, emptyState, sectionHeader (lines 104-255) as extension on ConnectedAccountsView
- **ConnectedAccountSheet.swift**: Extract actions: loadLinkedProviders, linkGoogle, linkApple, unlinkProvider, computed helpers (lines 257-349) as extension on ConnectedAccountsView
- **ConnectedAccountsView.swift**: Keep struct definition, state, body, headerSection, loadingView, linkedProvidersSection, availableProvidersSection

### 5. AvatarModeView.swift (348 lines)

- **AvatarModeDisplay.swift**: Extract avatarVisualization, outerRing, middleRing, innerOrb, stateIcon, conversationArea, dialogueBubble, typingIndicator (lines 90-246) as extension on AvatarModeView
- **AvatarModeControls.swift**: Extract voiceInputBar plus all computed color/size properties (lines 250-347) as extension on AvatarModeView
- **AvatarModeView.swift**: Keep struct definition, init, body, backgroundGradient, topBar

### 6. HeroCarousel.swift (335 lines)

- **HeroCarouselItem.swift**: Extract heroImage, heroPlaceholder, heroMetadata, metadataText, ratingBadge, heroActions, isFavorite (lines 135-334) as extension on HeroCarousel
- **HeroCarouselPaging.swift**: Extract NavigationDirection, navigationButton, navigateToItem, navigateToDetailPage, auto-rotation methods (lines 215-284) as extension on HeroCarousel
- **HeroCarousel.swift**: Keep struct definition, state, body

### 7. DownloadManager.swift (334 lines)

- **DownloadManager+Tasks.swift**: Extract task registry, helpers, URLSessionDownloadDelegate, AVAssetDownloadDelegate (lines 199-334) as extension on DownloadManager
- **DownloadManager.swift**: Keep class definition, properties, init, public API methods

### 8. MovieDetailView.swift (319 lines)

- **MovieDetailInfo.swift**: Extract backdropSection, backdropImage, metadataTag, metadataSection, genreChips, castSection, relatedSection, relatedSubtitle, aiLanguages (lines 76-298) as extension on MovieDetailView
- **MovieDetailActions.swift**: Extract actionButtons, downloadButton, favoriteButton, resolveAndShowTrailer, loadingState (lines 161-319) as extension on MovieDetailView
- **MovieDetailView.swift**: Keep struct definition, state, body, detailContent
