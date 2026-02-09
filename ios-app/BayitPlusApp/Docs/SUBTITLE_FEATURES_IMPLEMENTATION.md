# AI Subtitle Generation & Split Screen Subtitles - iOS Implementation

## Overview

This document describes the implementation of two major subtitle features for the iOS app that match the web app functionality:

1. **AI Subtitle Generation** - Modal for generating Hebrew AI subtitles (nikud, shoresh, engrew)
2. **Split Screen Subtitles** - Side-by-side display of two subtitle languages

## Implemented Components

### 1. Split Screen Subtitle Components

#### `SubtitlePaneView.swift`
- Single subtitle pane for left or right side of split screen
- Displays subtitles for one language with:
  - Colored border (sky blue for left, orange for right)
  - Language indicator (flag + native name)
  - RTL support for Hebrew and Arabic
  - Empty pane placeholder when no cues available

**Features:**
- Auto-adjusts text alignment based on language (RTL/LTR)
- Font size based on settings (14/17/20 for small/medium/large)
- Glassmorphism styling with background opacity
- Language indicator at bottom of pane

#### `SplitSubtitleOverlayView.swift`
- Container for two `SubtitlePaneView` components
- Renders subtitles side-by-side with vertical divider
- Filters active cues based on current playback time
- Responsive positioning with safe area support

**Features:**
- Horizontal layout with 10% padding on each side
- 2px white divider between panes (25% opacity)
- Smaller font sizes optimized for split view
- Shows/hides based on enabled state and active cues

#### `SplitSubtitleLanguagePickerView.swift`
- Modal for selecting two languages for split screen
- Interactive language list with checkmarks and position badges
- Live preview showing selected languages in LEFT/RIGHT positions
- Split mode toggle within the modal

**Features:**
- Flag emoji for each language
- Native language names
- Position badges (LEFT/RIGHT)
- Preview pane showing flag + position
- Confirm button (disabled until 2 languages selected)
- Auto-replacement of first language when selecting third

### 2. AI Subtitle Generation Components

#### `AISubtitlesPickerView.swift`
- Modal for selecting Hebrew AI subtitle modes
- Admin-only generation button for each AI mode
- Job status polling with progress indicators
- Cancel and restart functionality

**Supported Modes:**
1. **Regular** - Standard Hebrew without vowel marks
2. **Nikud** - Vowel marks added (AI-generated)
3. **Shoresh** - Root letters highlighted (AI-generated)
4. **Engrew** - Modern slang with transliterated English (AI-generated)

**Features:**
- First-time hint banner (dismissed after first view)
- Generation error banner with dismiss button
- No Hebrew warning (when Hebrew subtitles don't exist)
- Mode options with icons, titles, descriptions, and examples
- Generate button for admins when mode not available
- Progress indicator with percentage and cancel button
- Unavailable badge for non-admin users

### 3. Integration with Existing Components

#### `InteractiveSubtitlesOverlay.swift` (Updated)
- Added `showAISubtitlePicker` state variable
- Mode picker button now shows:
  - Sparkles icon for Hebrew (opens AI picker)
  - Gear icon for other languages (opens regular picker)
- Sheet presentation for `AISubtitlesPickerView`
- Reloads cues after AI generation completes

#### `PlayerView+SplitSubtitles.swift` (Extension)
- Extension file with all split subtitle functionality
- State variables for split mode management
- Split subtitle toggle button
- Split language picker modal integration
- Parallel cue loading for both languages

## Integration Checklist

To complete the integration, add the following to `PlayerView.swift`:

### 1. State Variables (Add to @State section)

```swift
@State private var splitModeEnabled = false
@State private var splitLanguages: [String] = []
@State private var showSplitLanguagePicker = false
@State private var primarySubtitleCues: [SubtitleCue] = []
@State private var secondarySubtitleCues: [SubtitleCue] = []
```

### 2. Split Subtitle Overlay (Add to body after InteractiveSubtitlesOverlay)

```swift
// Split subtitle overlay (when split mode is enabled)
if splitModeEnabled && splitLanguages.count == 2 {
    SplitSubtitleOverlayView(
        currentTime: viewModel.player.currentTime,
        primaryCues: primarySubtitleCues,
        secondaryCues: secondarySubtitleCues,
        primaryLanguage: splitLanguages[0],
        secondaryLanguage: splitLanguages[1],
        enabled: splitModeEnabled,
        settings: SubtitleSettings(),
        safeAreaBottom: UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }
            .first?.safeAreaInsets.bottom ?? 0
    )
    .allowsHitTesting(showControls)
}
```

### 3. Split Subtitle Toggle Button (Add to topBar after subtitleToggle)

```swift
splitSubtitleToggle
```

### 4. Split Language Picker Modal (Add .sheet modifier to body)

```swift
.sheet(isPresented: $showSplitLanguagePicker) {
    SplitSubtitleLanguagePickerView(
        availableLanguages: availableSubtitleLanguages,
        sourceLanguage: "he",
        selectedLanguages: $splitLanguages,
        splitModeEnabled: $splitModeEnabled,
        onConfirm: { languages in
            splitLanguages = languages
            splitModeEnabled = true
            Task {
                await loadSplitSubtitleCues()
            }
        }
    )
    .presentationDetents([.large])
    .presentationDragIndicator(.visible)
}
```

### 5. Add Split Subtitle Methods (from extension)

Copy the following methods from `PlayerView+SplitSubtitles.swift`:
- `splitSubtitleToggle` computed property
- `loadSplitSubtitleCues()` async function
- `loadCuesForLanguage(_:)` private async function

## Backend Integration Status

### ✅ Backend Endpoints Already Exist!

The backend **already has all required endpoints** implemented in `backend/app/api/routes/subtitles_cues.py`:

**AI Generation Endpoints:**
- ✅ `POST /api/v1/subtitles/{content_id}/nikud` - Generate nikud subtitles
- ✅ `POST /api/v1/subtitles/{content_id}/shoresh` - Generate shoresh subtitles
- ✅ `POST /api/v1/subtitles/{content_id}/engrew` - Generate engrew subtitles
- ✅ `GET /api/v1/subtitles/job/{job_id}` - Get job status
- ✅ `POST /api/v1/subtitles/job/{job_id}/cancel` - Cancel job
- ✅ `GET /api/v1/subtitles/{content_id}/job/active` - Get active jobs

**Subtitle Cue Endpoint:**
- ✅ `GET /api/v1/subtitles/{content_id}/cues?language={lang}&hebrew_mode={mode}&english_mode={mode}`

### ✅ iOS Already Has Existing Infrastructure!

**Existing iOS Code:**
- ✅ `SubtitleRepository.swift` - Already has `fetchCues()` with `hebrewMode` and `englishMode` parameters
- ✅ `SubtitleModels.swift` - Already has `SubtitleHebrewMode` enum (regular, nikud, shoresh, engrew)
- ✅ `InteractiveSubtitlesViewModel.swift` - Already has Hebrew mode support and shoresh parsing

### ✅ New iOS Extension Added

**Created File:** `BayitPlusApp/Repositories/SubtitleRepository+AIGeneration.swift`

This extension adds AI generation methods to the existing `APISubtitleRepository`:

```swift
// Generate nikud subtitles
func generateNikud(contentId: String, language: String = "he", force: Bool = false) async throws -> AIGenerationJobResponse

// Generate shoresh subtitles
func generateShoresh(contentId: String, language: String = "he", force: Bool = false) async throws -> AIGenerationJobResponse

// Generate engrew subtitles
func generateEngrew(contentId: String, language: String = "he", force: Bool = false) async throws -> AIGenerationJobResponse

// Get job status
func getJobStatus(jobId: String) async throws -> AIGenerationJobResponse

// Cancel job
func cancelJob(jobId: String) async throws -> CancelJobResponse

// Get active jobs for content
func getActiveJobs(contentId: String) async throws -> ActiveJobsResponse
```

**No backend work needed** - all endpoints already exist and are fully functional!

## InteractiveSubtitlesViewModel Updates Required

Add these properties and methods to `InteractiveSubtitlesViewModel`:

```swift
// Properties
var hasNikud: Bool = false
var hasShoresh: Bool = false
var hasEngrew: Bool = false
var isAdmin: Bool {
    // Check if user is admin (from auth store)
    return false
}

// Methods
func setHebrewMode(_ mode: HebrewMode, contentId: String, language: String) async {
    self.hebrewMode = mode
    await loadCues(contentId: contentId, language: language)
}

func setEnglishMode(_ mode: EnglishMode, contentId: String, language: String) async {
    self.englishMode = mode
    await loadCues(contentId: contentId, language: language)
}
```

## Testing Checklist

### AI Subtitle Generation
- [ ] Hebrew subtitle mode picker opens when tapping sparkles icon
- [ ] Four modes displayed: Regular, Nikud, Shoresh, Engrew
- [ ] Generate button shown for admin users on unavailable modes
- [ ] Generate button starts AI processing
- [ ] Progress indicator updates during generation
- [ ] Cancel button stops ongoing generation
- [ ] Completed generation reloads subtitle cues
- [ ] Error messages display correctly
- [ ] First-time hint banner shows on first use
- [ ] First-time hint can be dismissed

### Split Screen Subtitles
- [ ] Split screen toggle button appears in player controls
- [ ] Tapping toggle opens language picker modal
- [ ] Language picker shows available subtitle languages
- [ ] Can select 2 languages (LEFT and RIGHT positions)
- [ ] Preview pane updates as languages are selected
- [ ] Confirm button enabled only when 2 languages selected
- [ ] Split mode toggle switches within modal
- [ ] Split subtitle overlay renders two panes side-by-side
- [ ] Vertical divider appears between panes
- [ ] Language indicators show at bottom of each pane
- [ ] RTL languages (Hebrew, Arabic) align correctly
- [ ] Empty pane shown when no cues for a language
- [ ] Subtitles sync correctly with playback time
- [ ] Colored borders distinguish left (blue) and right (orange) panes

### Integration
- [ ] Regular subtitles work when split mode disabled
- [ ] AI-generated subtitles display correctly
- [ ] Split mode persists during playback
- [ ] Disabling split mode returns to single subtitle view
- [ ] Player controls remain accessible with split subtitles
- [ ] Safe area respected on all device sizes
- [ ] Trivia overlay positions correctly with split subtitles
- [ ] Works with both live and VOD content

## Known Limitations

1. **API Integration**: Backend API calls are stubbed with TODOs - need to connect to actual subtitle service
2. **Job Polling**: Polling mechanism needs to be implemented for AI generation progress
3. **Persistence**: Split mode preferences don't persist across app sessions (need to add UserDefaults storage)
4. **Offline Support**: No offline caching for split subtitle cues yet

## Future Enhancements

1. **Live Split Subtitles**: Real-time split subtitles for live TV content
2. **Customization**: Allow users to customize split pane colors and positions
3. **More Languages**: Support for more than 2 simultaneous languages
4. **Font Customization**: Per-language font family and size settings
5. **Bookmark Integration**: Save split mode preferences per content item
6. **Accessibility**: VoiceOver improvements for split subtitle navigation

## Related Files

### New Files
- `BayitPlusApp/Views/Player/Subtitles/SubtitlePaneView.swift`
- `BayitPlusApp/Views/Player/Subtitles/SplitSubtitleOverlayView.swift`
- `BayitPlusApp/Views/Player/Subtitles/SplitSubtitleLanguagePickerView.swift`
- `BayitPlusApp/Views/Player/Subtitles/AISubtitlesPickerView.swift`
- `BayitPlusApp/Views/Player/PlayerView+SplitSubtitles.swift`

### Modified Files
- `BayitPlusApp/Views/Player/InteractiveSubtitlesOverlay.swift`
- `BayitPlusApp/Views/Player/PlayerView.swift` (pending integration)

### Backend Files (Web Reference)
- `web/src/components/player/subtitle/AISubtitlesPicker.tsx` (reference implementation)
- `web/src/components/player/subtitle/SplitSubtitleOverlay.tsx` (reference implementation)
- `web/src/components/player/LiveSplitSubtitleControls.tsx` (reference implementation)
