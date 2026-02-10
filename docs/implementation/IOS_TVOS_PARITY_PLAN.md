# Bayit+ iOS-tvOS Full Parity Implementation Plan

**Created**: 2026-02-09
**Status**: IN PROGRESS
**Target**: Production-ready tvOS app with 100% iOS feature parity

---

## Executive Summary

**Critical Gap**: tvOS app is missing **72+ components** compared to iOS
**Total Estimated Effort**: 38-52 days (full-time equivalent)
**Approach**: Systematic phase-by-phase implementation
**Priority**: Start with highest-impact features (home screen, player)

---

## Current State Analysis

### iOS App
- **Total Components**: 100+ unique view components
- **Navigation**: Custom NavigationStack with routing, breadcrumbs, fullscreen overlays
- **Tab Structure**: 6 main tabs (Home, Live TV, VOD, Radio, Podcasts, Widgets)
- **Features**: Complete feature set including voice AI, social, trivia, widgets

### tvOS App
- **Total Components**: 28 unique view components
- **Navigation**: Native tvOS TabView (21 tabs)
- **Tab Structure**: Many specialized tabs but missing critical components
- **Features**: Basic content browsing, missing advanced features

### Parity Gap: **72+ missing components**

---

## Implementation Phases

## ✅ PHASE 0: PREPARATION (COMPLETED)

1. ✅ Comprehensive code scan
2. ✅ Screenshot comparison
3. ✅ Gap analysis
4. ✅ Documentation created
5. ✅ Hero carousel height fix (600pts for tvOS)

---

## 🚀 PHASE 1: HOME SCREEN PARITY (Priority: CRITICAL)

**Goal**: Bring tvOS home screen to iOS parity
**Estimated Time**: 3-5 days
**Status**: IN PROGRESS

### Components to Implement:

#### 1.1 CultureClock Component (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Shared/TVCultureClock.swift`
- **Port from**: `BayitPlusApp/Views/Shared/CultureClock.swift`
- **Features**:
  - Dual time zone display (Israel + user location)
  - Flag emoji display
  - Real-time clock updates
  - tvOS-optimized layout (larger fonts, focus-friendly)

#### 1.2 PageHeader Component (1-2 hours)
- **File**: `BayitPlusTVApp/Views/Shared/TVPageHeader.swift`
- **Port from**: `BayitPlusApp/Views/Shared/PageHeader.swift`
- **Features**:
  - Icon + title display
  - Consistent styling across all screens
  - tvOS focus navigation support

#### 1.3 LocationContentRow (3-4 hours)
- **File**: `BayitPlusTVApp/Views/Home/TVLocationContentRow.swift`
- **Port from**: `BayitPlusApp/Views/Home/LocationContentRow.swift`
- **Features**:
  - "Israelis in Your City" section
  - "Israeli Businesses Near You" section
  - Location-based content cards
  - Coverage indicator

#### 1.4 TrendingRow (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Home/TVTrendingRow.swift`
- **Port from**: `BayitPlusApp/Views/Content/TrendingRowView.swift`
- **Features**:
  - "What's Hot in Israel" content
  - Trending indicator badges
  - Focus-friendly card layout

#### 1.5 CityContentRow (2-3 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Home/TVCityContentRow.swift`
- **Features**:
  - Jerusalem-specific content
  - Tel Aviv-specific content
  - City badge indicators

#### 1.6 Enhanced Hero Metadata Overlay (2-3 hours)
- **Update**: `BayitPlusTVApp/Views/TVHomeView.swift`
- **Features**:
  - Year, duration, rating display
  - Enhanced description
  - Better gradient overlay
  - iOS-style metadata layout

#### 1.7 Update TVHomeView Integration (1-2 hours)
- **File**: `BayitPlusTVApp/Views/TVHomeView.swift`
- **Tasks**:
  - Add PageHeader
  - Add CultureClock
  - Add LocationContentRow
  - Add TrendingRow
  - Add CityContentRow
  - Maintain proper spacing and focus flow

### Testing Requirements:
- [ ] All components render correctly on Apple TV 4K
- [ ] Focus navigation works properly
- [ ] Time zones update correctly
- [ ] Location-based content loads
- [ ] Trending content displays
- [ ] City content displays
- [ ] No performance issues

---

## 🎬 PHASE 2: PLAYER & PLAYBACK PARITY (Priority: CRITICAL)

**Goal**: Complete video player feature parity
**Estimated Time**: 5-7 days
**Status**: PENDING

### Components to Implement:

#### 2.1 LiveDubbingOverlayView (4-5 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVLiveDubbingOverlayView.swift`
- **Features**:
  - Real-time dubbing controls
  - Language selection
  - Dubbing quality indicator
  - On/off toggle

#### 2.2 SubtitleSettingsView (3-4 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVSubtitleSettingsView.swift`
- **Features**:
  - Subtitle language selection
  - Font size adjustment
  - Background opacity
  - Position settings

#### 2.3 Chapter Navigation (5-6 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Player/TVChapterMarkersView.swift`
  - `BayitPlusTVApp/Views/Player/TVChapterListView.swift`
  - `BayitPlusTVApp/Views/Player/TVChapterNavigationView.swift`
- **Features**:
  - Chapter markers on timeline
  - Chapter list sheet
  - Skip to chapter
  - Chapter thumbnails

#### 2.4 AudioTrackSelectorView (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVAudioTrackSelectorView.swift`
- **Features**:
  - Multiple audio track support
  - Language labels
  - Audio quality indicators
  - Original/dubbed selection

#### 2.5 PlaybackSpeedControlView (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVPlaybackSpeedControlView.swift`
- **Features**:
  - Speed options (0.5x to 2.0x)
  - Visual feedback
  - Smooth transitions

#### 2.6 TranslationPopoverView (3-4 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVTranslationPopoverView.swift`
- **Features**:
  - Real-time translation display
  - Multiple target languages
  - Translation history

#### 2.7 ShoreshHighlightView (4-5 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVShoreshHighlightView.swift`
- **Features**:
  - Hebrew root word highlighting
  - Root definitions
  - Educational tooltips

#### 2.8 VoiceSelectorView (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Player/TVVoiceSelectorView.swift`
- **Features**:
  - AI voice selection
  - Voice preview
  - Language-specific voices

### Testing Requirements:
- [ ] All player overlays work with Siri Remote
- [ ] Focus navigation in player
- [ ] Real-time dubbing functional
- [ ] Subtitle rendering correct
- [ ] Chapter navigation smooth
- [ ] Audio track switching works
- [ ] Speed control functional
- [ ] Translation accurate

---

## 🎯 PHASE 3: TRIVIA & ENGAGEMENT (Priority: HIGH)

**Goal**: Interactive quiz and trivia features
**Estimated Time**: 2-3 days
**Status**: PENDING

### Components to Implement:

#### 3.1 Quiz Overlay System (6-8 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Trivia/TVQuizOverlayView.swift`
  - `BayitPlusTVApp/Views/Trivia/TVComprehensionQuizOverlayView.swift`
  - `BayitPlusTVApp/Views/Trivia/TVQuizQuestionView.swift`
  - `BayitPlusTVApp/Views/Trivia/TVQuizProgressView.swift`
  - `BayitPlusTVApp/Views/Trivia/TVQuizResultsView.swift`
  - `BayitPlusTVApp/Views/Trivia/TVQuizAnswerButton.swift`
- **Features**:
  - Live quiz during playback
  - Comprehension questions
  - Progress tracking
  - Results display
  - Leaderboard integration

#### 3.2 TriviaSettingsView (2-3 hours)
- **File**: `BayitPlusTVApp/Views/Trivia/TVTriviaSettingsView.swift`
- **Features**:
  - Quiz difficulty settings
  - Auto-play preferences
  - Notification settings

### Testing Requirements:
- [ ] Quiz overlays during video playback
- [ ] Answer selection with Siri Remote
- [ ] Progress tracking accurate
- [ ] Results display correctly
- [ ] Settings persist

---

## 👥 PHASE 4: SOCIAL FEATURES (Priority: HIGH)

**Goal**: Social interaction and watch parties
**Estimated Time**: 4-5 days
**Status**: PENDING

### Components to Implement:

#### 4.1 Watch Party Enhancement (5-6 hours)
- **Files**:
  - `BayitPlusTVApp/Views/WatchParty/TVWatchPartyView.swift` (enhance existing)
  - `BayitPlusTVApp/Views/WatchParty/TVCreatePartySheet.swift`
  - `BayitPlusTVApp/Views/WatchParty/TVJoinPartySheet.swift`
  - `BayitPlusTVApp/Views/WatchParty/TVActivePartySection.swift`
- **Features**:
  - Enhanced party UI with chat
  - Create/join party flows
  - Active party status
  - Participant list

#### 4.2 Direct Messaging (6-8 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Messages/TVDirectMessagesView.swift`
  - `BayitPlusTVApp/Views/Messages/TVConversationView.swift`
  - `BayitPlusTVApp/Views/Social/TVMessageBubble.swift`
  - `BayitPlusTVApp/Views/Social/TVMessageInputBar.swift`
- **Features**:
  - Message list
  - Conversation view
  - Text input (using tvOS keyboard)
  - Message bubbles

#### 4.3 Friends Enhancement (4-5 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Friends/TVFriendsView.swift` (enhance existing)
  - `BayitPlusTVApp/Views/Friends/TVFriendRequestCard.swift`
  - `BayitPlusTVApp/Views/Social/TVUserAvatarRow.swift`
  - `BayitPlusTVApp/Views/Social/TVOnlineStatusBadge.swift`
- **Features**:
  - Friend requests
  - Online status
  - User avatars
  - Friend list management

### Testing Requirements:
- [ ] Watch party creation works
- [ ] Party synchronization functional
- [ ] Messaging with tvOS keyboard
- [ ] Friend requests send/accept
- [ ] Online status updates
- [ ] Real-time updates

---

## ♟️ PHASE 5: CHESS INTEGRATION (Priority: MEDIUM)

**Goal**: Interactive chess game
**Estimated Time**: 2-3 days
**Status**: PENDING

### Components to Implement:

#### 5.1 Chess Game System (8-10 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Chess/TVChessView.swift`
  - `BayitPlusTVApp/Views/Chess/TVChessBoardView.swift`
  - `BayitPlusTVApp/Views/Chess/TVChessPieceView.swift`
  - `BayitPlusTVApp/Views/Chess/TVChessControlsView.swift`
  - `BayitPlusTVApp/Views/Chess/TVChessMoveHistoryView.swift`
- **Features**:
  - Full chess game implementation
  - Piece movement with Siri Remote
  - Move validation
  - Move history
  - Game controls (resign, draw offer, etc.)

### Testing Requirements:
- [ ] Chess board renders correctly
- [ ] Piece selection with Siri Remote
- [ ] Move validation accurate
- [ ] Move history displays
- [ ] Game state persists

---

## 🎙️ PHASE 6: VOICE & AI (Priority: HIGH)

**Goal**: Voice assistant and AI features
**Estimated Time**: 4-5 days
**Status**: PENDING

### Components to Implement:

#### 6.1 Voice Assistant (6-8 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Voice/TVVoiceAssistantSheet.swift`
  - `BayitPlusTVApp/Views/Voice/TVVoiceOnboardingView.swift`
  - `BayitPlusTVApp/Views/Voice/TVVoiceOnboardingSteps.swift`
  - `BayitPlusTVApp/Views/Voice/TVWakeWordSettingsView.swift`
  - `BayitPlusTVApp/Views/Voice/TVProactiveSuggestionBannerView.swift`
- **Features**:
  - Voice assistant modal
  - Voice onboarding flow
  - Wake word configuration
  - Proactive suggestions
  - Siri Remote microphone integration

#### 6.2 Chatbot System (4-5 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Chat/TVChatbotView.swift`
  - `BayitPlusTVApp/Views/Chat/TVChatMessageBubble.swift`
- **Features**:
  - AI chatbot interface
  - Message bubbles
  - Voice input support
  - Context-aware responses

#### 6.3 Avatar System (3-4 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Avatar/TVAvatarModeView.swift`
  - `BayitPlusTVApp/Views/Avatar/TVAvatarPreferencesView.swift`
  - `BayitPlusTVApp/Views/Shared/TVVoiceAvatarFAB.swift`
- **Features**:
  - AI avatar display
  - Avatar customization
  - Floating avatar button
  - Avatar animations

### Testing Requirements:
- [ ] Voice input via Siri Remote works
- [ ] Chatbot responds correctly
- [ ] Avatar displays properly
- [ ] Wake word detection (if supported)
- [ ] Onboarding flow complete

---

## 🔍 PHASE 7: SEARCH & DISCOVERY (Priority: CRITICAL)

**Goal**: AI-powered search
**Estimated Time**: 2-3 days
**Status**: PENDING

### Components to Implement:

#### 7.1 LLM Search System (8-10 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Search/TVLLMSearchView.swift`
  - `BayitPlusTVApp/Views/Search/TVLLMSearchResultsView.swift`
  - `BayitPlusTVApp/Views/Search/TVLLMSearchInterpretationView.swift`
- **Features**:
  - Natural language search
  - AI interpretation of queries
  - Smart results display
  - Search suggestions
  - tvOS keyboard optimization

### Testing Requirements:
- [ ] Search queries work correctly
- [ ] AI interpretation accurate
- [ ] Results display properly
- [ ] Keyboard input smooth
- [ ] Search history persists

---

## ⚙️ PHASE 8: SETTINGS & PREFERENCES (Priority: MEDIUM)

**Goal**: Complete settings system
**Estimated Time**: 3-4 days
**Status**: PENDING

### Components to Implement:

#### 8.1 Settings Screens (12-15 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Settings/TVLanguageSettingsView.swift`
  - `BayitPlusTVApp/Views/Settings/TVNotificationSettingsView.swift`
  - `BayitPlusTVApp/Views/Settings/TVPasskeyManagementView.swift`
  - `BayitPlusTVApp/Views/Settings/TVDevicePairingView.swift`
  - `BayitPlusTVApp/Views/Settings/TVSecurityView.swift`
  - `BayitPlusTVApp/Views/Settings/TVBillingView.swift`
  - `BayitPlusTVApp/Views/Settings/TVSubscriptionView.swift`
  - Enhancement to `BayitPlusTVApp/Views/TVSettingsView.swift`
- **Features**:
  - Language preferences
  - Notification settings
  - Passkey management
  - Device pairing (iOS/iPad/iPhone)
  - Security settings
  - Billing information
  - Subscription management

### Testing Requirements:
- [ ] All settings persist
- [ ] Language changes apply
- [ ] Notifications work
- [ ] Passkey creation/use
- [ ] Device pairing functional
- [ ] Billing info displays
- [ ] Subscription status correct

---

## 👨‍👩‍👧‍👦 PHASE 9: FAMILY CONTROLS (Priority: MEDIUM)

**Goal**: Parental controls and family features
**Estimated Time**: 2-3 days
**Status**: PENDING

### Components to Implement:

#### 9.1 Family Control System (8-10 hours)
- **Files**:
  - `BayitPlusTVApp/Views/FamilyControls/TVFamilyControlsView.swift`
  - `BayitPlusTVApp/Views/FamilyControls/TVFamilyPinModalView.swift`
  - `BayitPlusTVApp/Views/FamilyControls/TVTimeRangePickerView.swift`
  - `BayitPlusTVApp/Views/FamilyControls/TVContentRatingPickerView.swift`
  - `BayitPlusTVApp/Views/FamilyControls/TVAgeSliderView.swift`
- **Features**:
  - PIN protection
  - Time restrictions
  - Content rating filters
  - Age-based controls
  - Usage reports

### Testing Requirements:
- [ ] PIN entry works with Siri Remote
- [ ] Time restrictions enforce
- [ ] Content filtering accurate
- [ ] Age controls apply
- [ ] Parents can override

---

## 🕍 PHASE 10: CULTURAL & RELIGIOUS (Priority: MEDIUM)

**Goal**: Jewish cultural and religious features
**Estimated Time**: 3-4 days
**Status**: PENDING

### Components to Implement:

#### 10.1 Shabbat & Cultural Features (10-12 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Shabbat/TVShabbatBannerView.swift`
  - `BayitPlusTVApp/Views/Shabbat/TVZmanimView.swift`
  - `BayitPlusTVApp/Views/MorningRitual/TVMorningRitualView.swift`
  - Enhancement to `BayitPlusTVApp/Views/TVJudaismView.swift`
  - Enhancement to `BayitPlusTVApp/Views/TVCultureView.swift`
  - `BayitPlusTVApp/Views/Culture/TVCultureContentView.swift`
  - `BayitPlusTVApp/Views/Culture/TVCultureCardView.swift`
  - `BayitPlusTVApp/Views/Children/TVYoungtersView.swift`
- **Features**:
  - Shabbat mode overlay
  - Zmanim (prayer times)
  - Morning ritual flow
  - Enhanced Judaism content
  - Cultural content cards
  - Children's content sections

### Testing Requirements:
- [ ] Shabbat banner displays correctly
- [ ] Zmanim accurate for location
- [ ] Morning ritual flow works
- [ ] Cultural content curated
- [ ] Children's content appropriate

---

## 🧩 PHASE 11: WIDGETS & CUSTOMIZATION (Priority: MEDIUM)

**Goal**: Widget system and customization
**Estimated Time**: 4-5 days
**Status**: PENDING

### Components to Implement:

#### 11.1 Widget System (12-15 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Widgets/TVWidgetsView.swift`
  - `BayitPlusTVApp/Views/Widgets/TVWidgetsPageHeaderView.swift`
  - `BayitPlusTVApp/Views/Widgets/TVSystemWidgetGalleryView.swift`
  - `BayitPlusTVApp/Views/Widgets/TVPiPWidgetManagerView.swift`
- **Features**:
  - Add Widgets tab to main navigation
  - Widget gallery
  - Widget customization
  - PiP widgets (picture-in-picture)
  - Widget dock system
  - System widget integration

### Testing Requirements:
- [ ] Widgets tab accessible
- [ ] Widget gallery displays
- [ ] Widget customization works
- [ ] PiP widgets functional
- [ ] Widget focus navigation
- [ ] Widgets persist settings

---

## 📻 PHASE 12: RADIO TAB (Priority: HIGH)

**Goal**: Add Radio to main navigation
**Estimated Time**: 1-2 days
**Status**: PENDING

### Tasks:

#### 12.1 Radio Tab Integration (3-4 hours)
- **File**: `BayitPlusTVApp/App/TVMainTabView.swift`
- **Tasks**:
  - Add Radio to TVTab enum
  - Add Radio tab to TabView
  - Update tab ordering
  - Ensure TVRadioView works in tab context

#### 12.2 Enhance TVRadioView (2-3 hours)
- **File**: `BayitPlusTVApp/Views/TVRadioView.swift`
- **Tasks**:
  - Add PageHeader
  - Improve station cards
  - Add now playing section
  - Optimize focus navigation

### Testing Requirements:
- [ ] Radio tab appears in navigation
- [ ] Radio stations load
- [ ] Station selection works
- [ ] Playback functional
- [ ] Now playing displays

---

## 🧭 PHASE 13: NAVIGATION & UI INFRASTRUCTURE (Priority: CRITICAL)

**Goal**: Advanced navigation features
**Estimated Time**: 3-4 days
**Status**: PENDING

### Components to Implement:

#### 13.1 Navigation Infrastructure (10-12 hours)
- **Files**:
  - `BayitPlusTVApp/Views/Shared/TVTopNavigationBar.swift`
  - `BayitPlusTVApp/Views/Shared/TVBreadcrumbBar.swift`
  - Update `BayitPlusTVApp/App/TVNavigationCoordinator.swift`
  - Update `BayitPlusTVApp/App/TVContentView.swift`
- **Features**:
  - Top navigation bar (global actions)
  - Breadcrumb navigation
  - Fullscreen route handling (player overlay)
  - Deep linking support
  - Navigation history

### Testing Requirements:
- [ ] Top nav bar displays
- [ ] Breadcrumbs show path
- [ ] Fullscreen player works
- [ ] Navigation stack correct
- [ ] Back navigation smooth

---

## 🎨 ADDITIONAL MISSING COMPONENTS

### Audiobooks Enhancement
- `TVAudiobookDetailView.swift`
- `TVAudiobookFilterView.swift`
- `TVAudiobookCardView.swift`

### Podcasts Enhancement
- `TVPodcastEpisodeListView.swift`

### EPG Enhancement
- Enhanced `TVEPGView.swift` with iOS features

### Subscription
- `TVSubscriptionGateView.swift`

### Support
- `TVHelpView.swift`
- `TVSupportView.swift`

### Auth Enhancement
- `TVBiometricPromptView.swift`
- `TVAddProfileSheetView.swift`

### Shared Components
- `TVErrorStateView.swift`
- `TVScreenLoadingView.swift`

---

## Testing & Quality Assurance

### Per-Phase Testing
After each phase:
1. ✅ Build succeeds on tvOS
2. ✅ All new screens render correctly
3. ✅ Focus navigation works properly
4. ✅ Siri Remote interactions functional
5. ✅ No performance degradation
6. ✅ Screenshots taken for documentation

### Integration Testing
After every 2-3 phases:
1. ✅ Full app walkthrough
2. ✅ Cross-feature testing
3. ✅ Memory profiling
4. ✅ Performance testing
5. ✅ Accessibility audit

### Pre-Production Testing
Before marking production-ready:
1. ✅ Complete feature parity checklist
2. ✅ User acceptance testing
3. ✅ Performance benchmarks met
4. ✅ Accessibility compliance
5. ✅ Beta testing with real users

---

## Success Metrics

### Feature Parity
- [ ] 100% of iOS components ported to tvOS
- [ ] All iOS features functional on tvOS
- [ ] UI/UX optimized for 10-foot experience

### Quality Metrics
- [ ] Zero critical bugs
- [ ] <5 minor bugs
- [ ] 60fps playback performance
- [ ] <2s app launch time
- [ ] WCAG AA accessibility compliance

### User Experience
- [ ] Smooth focus navigation throughout
- [ ] Siri Remote interactions intuitive
- [ ] Visual consistency with iOS
- [ ] Feature discoverability high

---

## Risk Management

### Technical Risks
- **Risk**: tvOS API limitations
- **Mitigation**: Research alternatives, create custom implementations

- **Risk**: Performance issues with complex views
- **Mitigation**: Profiling, optimization, lazy loading

- **Risk**: Focus navigation complexity
- **Mitigation**: Test thoroughly, use focus debugging tools

### Timeline Risks
- **Risk**: Underestimated component complexity
- **Mitigation**: Built-in buffer time per phase

- **Risk**: Dependency on backend changes
- **Mitigation**: Identify early, parallel development

---

## Production Readiness Checklist

- [ ] All 13 phases completed
- [ ] All components implemented
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified
- [ ] Documentation updated
- [ ] Screenshots updated
- [ ] Beta testing completed
- [ ] App Store submission ready

---

## Progress Tracking

**Phase Completion:**
- [x] Phase 0: Preparation
- [ ] Phase 1: Home Screen Parity (IN PROGRESS)
- [ ] Phase 2: Player & Playback Parity
- [ ] Phase 3: Trivia & Engagement
- [ ] Phase 4: Social Features
- [ ] Phase 5: Chess Integration
- [ ] Phase 6: Voice & AI
- [ ] Phase 7: Search & Discovery
- [ ] Phase 8: Settings & Preferences
- [ ] Phase 9: Family Controls
- [ ] Phase 10: Cultural & Religious
- [ ] Phase 11: Widgets & Customization
- [ ] Phase 12: Radio Tab
- [ ] Phase 13: Navigation & UI Infrastructure

**Overall Progress**: 7% (1/13 phases complete + hero carousel fix)

---

## Notes

- This plan is living documentation - update as implementation progresses
- Adjust timelines based on actual complexity discovered
- Prioritize user-facing features over internal infrastructure
- Maintain tvOS-specific UX considerations (10-foot UI, focus navigation)
- Document all deviations from iOS implementation with rationale

---

**Last Updated**: 2026-02-09
**Next Review**: After Phase 1 completion
