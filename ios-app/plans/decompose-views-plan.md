# View Decomposition Plan

## 1. OnboardingAIView.swift (397 lines)

- Main view: keep struct, body, progressIndicator, stepContent, navigationButtons (~120 lines)
- OnboardingAISteps.swift: welcomeStep, contentTasteStep, genreGrid, voiceSetupStep, profileCreationStep, avatarPicker, preferenceRow, togglePreference (~200 lines)

## 2. ConnectedAccountsView.swift (350 lines)

- Main view: keep struct, body, headerSection, loadingView, linkedProvidersSection, emptyState, availableProvidersSection, helpers, actions, preview (~200 lines)
- ConnectedAccountRow.swift: linkedProviderRow, linkProviderButton, sectionHeader (~80 lines)

## 3. AvatarModeView.swift (348 lines)

- Main view: keep struct, init, body, backgroundGradient, topBar, voiceInputBar, computed color/size props (~170 lines)
- AvatarModeSelection.swift: avatarVisualization, outerRing, middleRing, innerOrb, stateIcon, conversationArea, dialogueBubble, typingIndicator (~180 lines)

## 4. HeroCarousel.swift (335 lines)

- Main view: keep struct, body, heroActions, navigation logic, auto-rotation, isFavorite (~180 lines)
- HeroCarouselItem.swift: heroImage, heroPlaceholder, heroMetadata, metadataText, ratingBadge, navigationButton, NavigationDirection (~155 lines)

## 5. MovieDetailView.swift (319 lines)

- Main view: keep struct, body, detailContent, backdropSection, backdropImage, actionButtons, favoriteButton, downloadButton, metadataTag, resolveAndShowTrailer, loadingState (~185 lines)
- MovieDetailSections.swift: metadataSection, genreChips, castSection, relatedSection, relatedSubtitle, aiLanguages (~100 lines)

## 6. VoiceAssistantSheet.swift (316 lines)

- Main view: keep struct, body, header, conversationArea, voiceButton, computed props (~135 lines)
- VoiceAssistantControls.swift: voiceOrb, stateIcon, orbColor, outerRingSize, actions (handleVoiceButtonTap, startListening, stopListeningAndProcess, processTranscript, stopListeningIfNeeded) (~180 lines)

## 7. PodcastsView.swift (313 lines)

- Main view: keep PodcastsView struct (~200 lines)
- PodcastRow.swift: PodcastShowCard struct (~110 lines)

## 8. LoginView.swift (307 lines)

- Main view: keep struct, body, glassCard, cardHeader, errorMessage, signInButton, socialButtons, signUpLink, termsFooter (~130 lines)
- LoginFormFields.swift: emailField, passwordField, biometric helpers, all action methods (~175 lines)

## 9. InteractiveMomentOverlayView.swift (305 lines)

- Main view: keep struct, body, circles, stillImage, cleanupPlayers, dismissAfterDelay, phase enum, FillVideoLayer (~145 lines)
- InteractiveMomentContent.swift: setupAvatarPlayer, onAvatarFinished, setupCharacterPlayer, waitForPlayerReady (~160 lines)

## 10. MagicMirrorView.swift (294 lines)

- Main view: keep struct, body, createAvatarPrompt, errorView, refreshButton, reRecordButton, loadGreeting, loadAvatarImage (~160 lines)
- MagicMirrorDisplay.swift: greetingContent, avatarDisplayView, playGreetingButton, avatarPlaceholder, greetingCard, vocabularyCard (~135 lines)
