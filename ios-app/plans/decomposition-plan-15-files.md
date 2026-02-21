# File Decomposition Plan - 15 iOS Files Under 200 Lines

## Date: 2026-02-21

## Summary

Decompose 15 Swift files that exceed 200 lines into smaller files, each under 200 lines.

## File Breakdown

### 1. PodcastsView.swift (313 lines -> ~200 + ~113)

- Keep: PodcastsView struct (body, contentView, loadRadioStations, categoryFilters, showGrid, loadingState, audiobooksSection) -- lines 1-202
- Extract: PodcastShowCard struct -> PodcastShowCard.swift -- lines 204-313

### 2. AudioPlaybackManager.swift (312 lines -> ~190 + ~122)

- Keep: Class declaration, observable state, dependencies, init, play, playDirectURL, togglePlayPause, stop -- lines 1-~165
- Extract: Sleep timer controls, skip/restart, startPlayback, updateNowPlayingPosition, resetState, RemoteCommandDelegate extension, ContentType mapping -> AudioPlaybackManager+Controls.swift -- lines ~143-312

### 3. UserRepository.swift (312 lines -> ~97 + ~200)

- Keep: Protocol (UserRepository) -- already 97 lines
- Extract: APIUserRepository implementation -> APIUserRepository.swift -- lines 99-312
- Protocol is already under 200 lines, implementation is 213 lines -- need to split impl too
- Split impl: APIUserRepository.swift (Profile + Favorites + Playlists) ~133 lines
- Extension: APIUserRepository+Downloads.swift (Downloads + Recordings + Verification + Account) ~80 lines

### 4. LoginView.swift (307 lines -> ~163 + ~145)

- Keep: LoginView struct (body, glassCard, cardHeader, errorMessage, emailField, passwordField, signInButton, signUpLink, termsFooter) -- lines 1-222
- Extract: Social buttons + biometric helpers + action handlers -> LoginView+Actions.swift -- lines ~143-307

### 5. InteractiveMomentOverlayView.swift (305 lines -> ~166 + ~139)

- Keep: InteractiveMomentOverlayView (body, circles, stillImage, setupAvatarPlayer, onAvatarFinished) -- lines 1-157
- Extract: setupCharacterPlayer, waitForPlayerReady, lifecycle helpers, phase enum, FillVideoLayer -> InteractiveMomentOverlayView+Players.swift -- lines 159-305

### 6. MagicMirrorView.swift (294 lines -> ~161 + ~133)

- Keep: MagicMirrorView (body, createAvatarPrompt, greetingContent, avatarDisplayView) -- lines 1-159
- Extract: playGreetingButton, avatarPlaceholder, greetingCard, vocabularyCard, errorView, refreshButton, reRecordButton, loadGreeting, loadAvatarImage -> MagicMirrorView+Content.swift -- lines 161-294

### 7. MediaPlayerViewModel.swift (294 lines -> ~153 + ~141)

- Keep: Class declaration, state, dependencies, init(s) -- lines 1-123
- Extract: load(), playback control, quality, cleanup, helpers -> MediaPlayerViewModel+Playback.swift -- lines 125-294

### 8. HouseholdView.swift (291 lines -> ~184 + ~107)

- Keep: HouseholdView (body, createHouseholdSection, householdHeader, membersSection, memberRow) -- lines 1-184
- Extract: avatarView, avatarPlaceholder, addMemberSection, rolePicker, roleButton -> HouseholdView+Members.swift -- lines 186-291

### 9. LiveTVRepository.swift (288 lines -> ~110 + ~178)

- Keep: Protocol (LiveTVRepository) -- lines 1-110
- Extract: APILiveTVRepository implementation -> APILiveTVRepository.swift -- lines 112-288

### 10. GlassAILanguagePickerView.swift (287 lines -> ~153 + ~134)

- Keep: GlassAILanguagePickerView (body, splitScreenToggle, splitToggleBackground, splitHint, languageList, singleLanguageRow, splitLanguageRow) -- lines 1-154
- Extract: languageRowContent, confirmButton, confirmButtonBackground, dismissButton, helpers -> GlassAILanguagePickerView+Rows.swift -- lines 156-287

### 11. HomeView.swift (281 lines -> ~68 + ~200)

- Keep: HomeView struct (body, task, onChange) -- lines 1-67
- Extract: contentSections, youngstersSection, loadingState, errorState -> HomeView+Sections.swift -- lines 69-284

### 12. AudiobookDetailView.swift (279 lines -> ~153 + ~126)

- Keep: AudiobookDetailView (body, detailContent, coverSection, coverPlaceholder, metadataSection, metadataRow, playbackControls) -- lines 1-153
- Extract: chapterList, chapterRow, playback helpers -> AudiobookChapterList.swift -- lines 155-279

### 13. SubscriptionView.swift (278 lines -> ~129 + ~149)

- Keep: SubscriptionView (body, headerSection, errorBanner, billingPeriodPicker, planCards) -- lines 1-129
- Extract: planCard, cancelSection, externalPaymentDisclosure -> SubscriptionView+Plans.swift -- lines 131-278

### 14. RegisterView.swift (273 lines -> ~135 + ~138)

- Keep: RegisterView struct (body, glassCard, cardHeader, errorMessage, nameField, emailField, passwordField, confirmPasswordField, labeledField) -- lines 1-135
- Extract: termsCheckbox, checkboxIcon, termsLabel, buttons, socialButtons, signInLink, actions -> RegisterView+Actions.swift -- lines 137-273

### 15. ZmanimView.swift (272 lines -> ~117 + ~155)

- Keep: ZmanimView (body, content, statusSection) -- lines 1-116
- Extract: zmanimTimesSection, zmanimRow, divider, settingsSection, contentSection, sectionHeader -> ZmanimView+Sections.swift -- lines 118-272
