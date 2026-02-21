# File Decomposition Plan

## Analysis Summary

After reading all 14 files, here is the decomposition plan. Each file will be split
so that the original file stays under 200 lines, with extracted code in extension files.

### 1. HomeViewModel.swift (390 lines -> ~160 + ~240)

- Keep: properties, init, loadFeatured, refresh, loadAdditionalSections, isCancellationError, CultureCityWithContent
- Extract to HomeViewModel+Sections.swift: All individual load methods (loadLiveChannels through loadCultureCities)

### 2. ContentRepository.swift (318 lines -> ~150 + ~175)

- Keep: ContentRepository protocol (135 lines) + APIContentRepository init + first 4 methods
- Extract to ContentRepository+Convenience.swift: remaining APIContentRepository methods (fetchIsraelisInCity through fetchTrailerStream)

### 3. CategoryRepository.swift (327 lines -> ~155 + ~180)

- Keep: CategoryRepository protocol + APICategoryRepository init + Children/Youngsters methods
- Extract to CategoryRepository+Convenience.swift: Judaism, Flows, Morning Ritual, Culture Cities methods

### 4. GLBBuilder.swift (321 lines -> ~120 + ~200)

- Keep: build() method, buildJSON(), JSON helpers
- Extract to GLBBuilder+Geometry.swift: Binary helpers (appendVec3Array, etc.) + Geometry helpers (computeNormals, computeBounds)

### 5. AudioPlaybackManager.swift (313 lines -> ~175 + ~145)

- Keep: properties, init, play(), playDirectURL(), togglePlayPause(), stop(), startPlayback(), resetState()
- Extract to AudioPlaybackManager+Controls.swift: sleep timer controls, skip/restart, RemoteCommandDelegate, ContentType mapping

### 6. UserRepository.swift (313 lines -> ~160 + ~160)

- Keep: UserRepository protocol + APIUserRepository init + Profile + Favorites + Playlists methods
- Extract to UserRepository+Convenience.swift: Downloads, Recordings, Verification, Account Management

### 7. HouseholdView.swift (292 lines -> ~140 + ~155)

- Keep: body, createHouseholdSection, householdHeader, membersSection
- Extract to HouseholdMemberRow.swift: memberRow, avatarView, avatarPlaceholder, addMemberSection, rolePicker, roleButton

### 8. LiveTVRepository.swift (289 lines -> ~170 + ~125)

- Keep: LiveTVRepository protocol + APILiveTVRepository init + path validation + first 5 methods
- Extract to LiveTVRepository+Convenience.swift: remaining API methods (fetchCatchUpSummary through fetchChannelChatHistory)

### 9. GlassAILanguagePickerView.swift (288 lines -> ~135 + ~155)

- Keep: body, splitScreenToggle, splitHint, languageList, single/split rows
- Extract to AILanguageGrid.swift: languageRowContent, confirmButton, dismissButton, all helper methods

### 10. HomeView.swift (285 lines -> ~100 + ~190)

- Keep: properties, body, .task/.onChange, contentSections
- Extract to HomeView+Sections.swift: youngstersSection, loadingState, errorState

### 11. AudiobookDetailView.swift (280 lines -> ~115 + ~170)

- Keep: body, detailContent, coverSection, metadataSection
- Extract to AudiobookDetailSections.swift: playbackControls, chapterList, chapterRow, all playback helpers

### 12. SubscriptionView.swift (278 lines -> ~130 + ~155)

- Keep: body, headerSection, errorBanner, billingPeriodPicker, planCards
- Extract to SubscriptionPlanCard.swift: planCard, cancelSection, externalPaymentDisclosure

### 13. RegisterView.swift (273 lines -> ~140 + ~140)

- Keep: body, glassCard, cardHeader, errorMessage, form fields, labeledField
- Extract to RegisterFormFields.swift: termsCheckbox, buttons, socialButtons, signInLink, action handlers

### 14. ZmanimView.swift (272 lines -> ~130 + ~145)

- Keep: body, content, statusSection, zmanimTimesSection
- Extract to ZmanimTimeRow.swift: zmanimRow, divider, settingsSection, contentSection, sectionHeader
