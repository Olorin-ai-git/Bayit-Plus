# Voice E2E Test Scenarios

**Phase 7.2: Voice Command Testing**
**Total Test Cases:** 25+
**Target Success Rate:** 90%+

---

## Prerequisites

- [ ] Native modules configured (SpeechModule, TTSModule)
- [ ] Backend API accessible
- [ ] Microphone permissions granted
- [ ] AudioCaptureModule working with VAD
- [ ] Menu button voice trigger configured

---

## Test Environment

### Audio Setup
- **Distance:** 10 feet from Apple TV (typical TV viewing distance)
- **Noise Level:** < 50dB ambient (quiet room)
- **Microphone:** Apple TV integrated microphone
- **Audio Output:** TV speakers at moderate volume

### Testing Protocol
1. Trigger voice with long-press Menu button (500ms)
2. Wait for listening indicator (purple pulsing)
3. Speak command clearly in Hebrew or English
4. Observe response and navigation
5. Record: Success/Failure, Response Time, Accuracy

---

## Navigation Commands (7 tests)

### TC-NAV-001: Go to Home
**Command:** "Show home" / "עבור לדף הבית"
**Expected:**
- Navigate to HomeScreen
- Display trending shelves
- Focus on first content card
**Pass Criteria:** Correct navigation in < 2s

### TC-NAV-002: Show Live TV
**Command:** "Show live TV" / "הצג טלוויזיה חיה"
**Expected:**
- Navigate to LiveTVScreen
- Display 5x4 channel grid
- Focus on first channel
**Pass Criteria:** Correct navigation + channel grid visible

### TC-NAV-003: Open Search
**Command:** "Search for movies" / "חפש סרטים"
**Expected:**
- Navigate to SearchScreen
- Display search results
- Focus on voice search button
**Pass Criteria:** Search results displayed

### TC-NAV-004: Go to Settings
**Command:** "Open settings" / "פתח הגדרות"
**Expected:**
- Navigate to SettingsScreen
- Display settings sections
- Focus on first setting
**Pass Criteria:** Settings screen visible

### TC-NAV-005: Show Radio
**Command:** "Show radio stations" / "הצג תחנות רדיו"
**Expected:**
- Navigate to RadioScreen
- Display 6-column station grid
- Focus on first station
**Pass Criteria:** Radio grid visible

### TC-NAV-006: Open Profile
**Command:** "Go to my profile" / "עבור לפרופיל שלי"
**Expected:**
- Navigate to ProfileScreen
- Display user profile
- Show avatar and stats
**Pass Criteria:** Profile data visible

### TC-NAV-007: Show Favorites
**Command:** "Show my favorites" / "הצג את המועדפים שלי"
**Expected:**
- Navigate to FavoritesScreen
- Display favorited content
- Focus on first item
**Pass Criteria:** Favorites grid visible

---

## Content Playback Commands (5 tests)

### TC-PLAY-001: Play Specific Channel
**Command:** "Play channel Galatz" / "הפעל ערוץ גלגלצ"
**Expected:**
- Navigate to PlayerScreen
- Fetch stream URL for Galatz
- Start video playback
- Display channel logo and program info
**Pass Criteria:** Video playing in < 3s

### TC-PLAY-002: Pause Playback
**Command:** "Pause" / "עצור"
**Expected:**
- Pause current video/audio
- Display pause icon
- Keep progress bar visible
**Pass Criteria:** Playback paused immediately

### TC-PLAY-003: Resume Playback
**Command:** "Play" / "הפעל"
**Expected:**
- Resume playback from paused position
- Hide pause icon
- Controls auto-hide after 5s
**Pass Criteria:** Playback resumes

### TC-PLAY-004: Skip Forward
**Command:** "Skip ahead 30 seconds" / "דלג קדימה 30 שניות"
**Expected:**
- Seek forward 30 seconds
- Update progress bar
- Continue playback
**Pass Criteria:** Correct seek position

### TC-PLAY-005: Skip Backward
**Command:** "Go back 10 seconds" / "חזור 10 שניות אחורה"
**Expected:**
- Seek backward 10 seconds
- Update progress bar
- Continue playback
**Pass Criteria:** Correct seek position

---

## Search Commands (4 tests)

### TC-SEARCH-001: Search Movies
**Command:** "Search for action movies" / "חפש סרטי פעולה"
**Expected:**
- Navigate to SearchScreen
- Apply "Movies" + "Action" filters
- Display results in 6-column grid
**Pass Criteria:** Relevant results displayed

### TC-SEARCH-002: Search Series
**Command:** "Find comedy series" / "מצא סדרות קומדיה"
**Expected:**
- Navigate to SearchScreen
- Apply "Series" + "Comedy" filters
- Display results
**Pass Criteria:** Comedy series shown

### TC-SEARCH-003: Search by Name
**Command:** "Search for The Crown" / "חפש את הכתר"
**Expected:**
- Navigate to SearchScreen
- Enter query "The Crown"
- Display matching content
**Pass Criteria:** Exact match at top of results

### TC-SEARCH-004: Voice Search Clear
**Command:** "Clear search" / "נקה חיפוש"
**Expected:**
- Clear search query
- Return to empty search state
- Focus on voice search button
**Pass Criteria:** Search cleared

---

## Multi-Window Commands (3 tests)

### TC-WINDOW-001: Open Multi-Window
**Command:** "Show windows" / "הצג חלונות"
**Expected:**
- Display MultiWindowManager overlay
- Show 4 windows in current layout
- Focus on first window
**Pass Criteria:** All windows visible

### TC-WINDOW-002: Close Windows
**Command:** "Close all windows" / "סגור את כל החלונות"
**Expected:**
- Close MultiWindowManager
- Return to main screen
- Clear focused window state
**Pass Criteria:** Windows closed

### TC-WINDOW-003: Switch Layout
**Command:** "Change to grid layout" / "עבור למצב רשת"
**Expected:**
- Switch to Grid 2x2 layout
- Rearrange windows
- Persist layout preference
**Pass Criteria:** Grid layout active

---

## System Commands (3 tests)

### TC-SYS-001: Volume Up
**Command:** "Increase volume" / "הגבר עוצמת קול"
**Expected:**
- Increase system volume by 10%
- Display volume indicator
- Apply to audio playback
**Pass Criteria:** Volume increased

### TC-SYS-002: Volume Down
**Command:** "Decrease volume" / "הנמך עוצמת קול"
**Expected:**
- Decrease system volume by 10%
- Display volume indicator
**Pass Criteria:** Volume decreased

### TC-SYS-003: What's Playing
**Command:** "What's playing?" / "מה מנגן עכשיו?"
**Expected:**
- Display current content info
- Show title, channel, program
- TTS response with details
**Pass Criteria:** Correct info displayed + spoken

---

## Error Handling (3 tests)

### TC-ERROR-001: No Speech Detected
**Command:** [Silence for 45 seconds]
**Expected:**
- Timeout after 45s
- Display "No speech detected" error
- Offer retry option
**Pass Criteria:** Graceful timeout handling

### TC-ERROR-002: Unknown Command
**Command:** "Do a barrel roll" / "תעשה היפוך חבית"
**Expected:**
- Display "Command not recognized" error
- Suggest valid commands
- Return to previous screen
**Pass Criteria:** Error message + suggestions

### TC-ERROR-003: Network Error
**Command:** "Play channel Kan 11" [with no network]
**Expected:**
- Display "Network error" message
- Show retry button
- Cache command for retry
**Pass Criteria:** Network error handled

---

## Bilingual Testing (Hebrew + English)

### TC-LANG-001: Hebrew Commands
**Test 5 commands in Hebrew:**
- "הצג דף הבית"
- "הפעל ערוץ גלגלצ"
- "חפש סרטים"
- "פתח הגדרות"
- "עצור"
**Pass Criteria:** 4/5 success rate minimum

### TC-LANG-002: English Commands
**Test 5 commands in English:**
- "Show home"
- "Play channel Galatz"
- "Search for movies"
- "Open settings"
- "Pause"
**Pass Criteria:** 4/5 success rate minimum

### TC-LANG-003: Mixed Language
**Hebrew command + English entity:**
- "הפעל ערוץ CNN"
- "חפש את Friends"
**Pass Criteria:** Correctly parse mixed language

---

## Test Execution Log Template

```markdown
## Test Session: [Date/Time]
**Tester:** [Name]
**Device:** Apple TV 4K (3rd gen)
**tvOS Version:** 17.0
**Build:** [Version]

### Test Results

| Test ID | Command | Language | Pass/Fail | Response Time | Notes |
|---------|---------|----------|-----------|---------------|-------|
| TC-NAV-001 | "Show home" | EN | ✅ Pass | 1.2s | - |
| TC-NAV-002 | "הצג טלוויזיה חיה" | HE | ✅ Pass | 1.4s | - |
| TC-PLAY-001 | "Play channel Galatz" | EN | ❌ Fail | - | Network timeout |
| ... | ... | ... | ... | ... | ... |

### Summary
- **Total Tests:** 25
- **Passed:** 23
- **Failed:** 2
- **Success Rate:** 92%
- **Average Response Time:** 1.5s

### Issues Found
1. [P1] Network timeout when playing live channels
2. [P2] Hebrew speech recognition occasionally misses last word

### Recommendations
1. Increase network timeout to 10s
2. Tune VAD for Hebrew language
```

---

## Acceptance Criteria

### Must Pass (P0)
- [ ] 90%+ overall success rate
- [ ] All navigation commands work
- [ ] Playback controls functional
- [ ] Error handling graceful
- [ ] No app crashes during voice commands

### Should Pass (P1)
- [ ] Hebrew and English parity (< 5% difference)
- [ ] Average response time < 2s
- [ ] TTS responses clear and understandable
- [ ] Mixed language commands work

### Nice to Have (P2)
- [ ] 95%+ success rate
- [ ] Response time < 1.5s
- [ ] Proactive suggestions working
- [ ] Wake word detection functional

---

## Troubleshooting Guide

### Low Recognition Rate
- Check microphone permissions
- Reduce ambient noise
- Increase speech timeout
- Tune VAD thresholds

### High Latency
- Check network connection
- Profile backend API response time
- Optimize audio processing pipeline
- Reduce audio sample rate if needed

### TTS Issues
- Verify TTSModule integration
- Check audio ducking during TTS
- Test TTS rate (0.9x for TV)
- Ensure speaker output correct

---

**Next Steps:** After voice testing passes, proceed to Multi-Window Testing (Phase 7.3)
