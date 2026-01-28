# Bayit+ Mobile App - Expected Screen Layouts
## ASCII UI Mockups and Design Specifications

---

## Screen 1: Login Screen

```
┌─────────────────────────────────┐
│                                 │
│     BAYIT+ STREAMING APP        │
│                                 │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Email Address            │   │
│  │ test@example.com         │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Password                 │   │
│  │ ••••••••••••••••         │   │
│  └──────────────────────────┘   │
│                                 │
│  ☑ Remember Me                  │
│                                 │
│  ┌──────────────────────────┐   │
│  │ LOGIN                    │   │
│  └──────────────────────────┘   │
│                                 │
│  Forgot Password?               │
│  OR                             │
│  [👆 Biometric Login]           │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Logo/branding at top
- Email input (large, 44dp touch target)
- Password input (masked text)
- Remember Me checkbox
- Login button (primary color)
- Forgot Password link
- Biometric login option (if available)

**Color Scheme**:
- Background: Dark (glassmorphism dark mode)
- Text: White (high contrast)
- Input borders: Semi-transparent white
- Button: Primary brand color

---

## Screen 2: Home Screen

```
┌─────────────────────────────────┐
│ 🏠 HOME    📺 LIVETV  📼 VOD    │
│ 📻 RADIO   🎙️ PODCASTS 👤 ME   │
├─────────────────────────────────┤
│                                 │
│   FEATURED CONTENT CAROUSEL     │
│  ╔═════════════════════════╗    │
│  ║                         ║    │
│  ║   [Video Thumbnail]     ║    │
│  ║                         ║    │
│  ║  "Episode 1: Title"     ║    │
│  ║  Action | 1h 45m        ║    │
│  ║  ▶ PLAY  ♥ ADD          ║    │
│  ╚═════════════════════════╝    │
│  ◀                            ▶ │
│                                 │
│ RECOMMENDED FOR YOU              │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[1] │ │[2] │ │[3] │            │
│ │    │ │    │ │    │            │
│ │9.2⭐│ │8.5⭐│ │7.8⭐│            │
│ └────┘ └────┘ └────┘            │
│                                 │
│ DRAMA SERIES                     │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[4] │ │[5] │ │[6] │            │
│ │    │ │    │ │    │            │
│ │    │ │    │ │    │            │
│ └────┘ └────┘ └────┘            │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Top navigation tabs (6 tabs: Home, LiveTV, VOD, Radio, Podcasts, Profile)
- Featured content carousel (horizontal scroll)
- Large thumbnail with play button overlay
- Recommended content grid (3-column layout)
- Horizontal scrolling carousels by category
- Glassmorphic card design with blur effect

**Responsive Layout**:
- 360px width: 1 column
- 540px width: 2 columns
- 720px+ width: 3+ columns
- FOLDABLE: Special layout handling

---

## Screen 3: LiveTV Screen

```
┌─────────────────────────────────┐
│ 🏠 HOME    📺 LIVETV  📼 VOD    │
├─────────────────────────────────┤
│                                 │
│ LIVE CHANNELS                   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ CHANNEL 1                │   │
│ │ Now: Movie Title         │   │
│ │ 15:30 - 17:45 | 8.5 ⭐   │   │
│ │ ▶ WATCH                  │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ CHANNEL 2                │   │
│ │ Now: News Program        │   │
│ │ 15:00 - 16:00 | LIVE     │   │
│ │ ▶ WATCH                  │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ CHANNEL 3                │   │
│ │ Now: Sports Game         │   │
│ │ 16:00 - 18:00 | 9.0 ⭐   │   │
│ │ ▶ WATCH                  │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ CHANNEL 4                │   │
│ │ Now: Drama Series        │   │
│ │ 20:00 - 21:00 | 8.8 ⭐   │   │
│ │ ▶ WATCH                  │   │
│ └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Live channel list
- Channel thumbnail/logo
- Current program title
- Time slot and duration
- Rating
- Watch button
- Live indicator (🔴 LIVE)

**Features**:
- Real-time program info (WebSocket)
- Watch party overlay
- Live chat indicator
- Program guide (EPG)

---

## Screen 4: Video Player

```
┌─────────────────────────────────┐
│                                 │
│  ╔═════════════════════════╗    │
│  ║  [VIDEO PLAYING]        ║    │
│  ║                         ║    │
│  ║  ▶ Video Content ────── ║    │
│  ║                         ║    │
│  ║  🔊 Audio Track 1       ║    │
│  ║  (Original + Dubbed)    ║    │
│  ║                         ║    │
│  ║  [Subtitles: English]   ║    │
│  ║                         ║    │
│  ║  [ ] [ ] [ ] [ ]        ║    │
│  ║  CC 720p Settings ⛰️  ║    │
│  ╚═════════════════════════╝    │
│                                 │
│  0:45 ──────●───────── 1:45:32  │
│             45s                 │
│                                 │
│  ◄◄   ⏸    ►►   ⏹   ↗           │
│                                 │
│ Title: Episode 1 - Pilot        │
│ Action | Drama | 2024 | 8.5 ⭐  │
│                                 │
│ NEXT EPISODE: "Chapter 2"       │
│ Auto-play in 10s... CANCEL      │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Video player viewport
- Playback progress bar with seek position
- Current time and total duration
- Playback controls (previous, play/pause, next, stop)
- Quality selector (360p/480p/720p/1080p)
- Subtitle toggle and selection
- Audio track selector (original + dubbed with volume control)
- Settings gear icon
- Fullscreen button
- Title and metadata below player

**Interactive Features**:
- Tap to show/hide controls (auto-hide after 3s)
- Swipe left/right to seek
- Pinch to zoom
- Double-tap to play/pause
- Gesture controls for brightness/volume

---

## Screen 5: VOD (Video on Demand) Screen

```
┌─────────────────────────────────┐
│ 🏠 HOME    📺 LIVETV  📼 VOD    │
├─────────────────────────────────┤
│                                 │
│ 🔍 Search...    ▼ Filter  ⚙️    │
│                                 │
│ FEATURED MOVIES                 │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[🎬]│ │[🎬]│ │[🎬]│ ▶         │
│ │ 9.2│ │ 8.5│ │ 7.8│            │
│ └────┘ └────┘ └────┘            │
│                                 │
│ DRAMA SERIES                     │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[📺]│ │[📺]│ │[📺]│ ▶         │
│ │ 8.9│ │ 8.3│ │ 8.1│            │
│ └────┘ └────┘ └────┘            │
│                                 │
│ ACTION & ADVENTURE               │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[🎬]│ │[🎬]│ │[🎬]│ ▶         │
│ │ 8.7│ │ 8.4│ │ 8.0│            │
│ └────┘ └────┘ └────┘            │
│                                 │
│ COMEDY SHOWS                     │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[🎬]│ │[🎬]│ │[🎬]│ ▶         │
│ │ 7.9│ │ 7.6│ │ 7.3│            │
│ └────┘ └────┘ └────┘            │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Search bar at top
- Filter and sort options
- Multiple content carousels by category
- Content cards with thumbnail, title, rating
- Horizontal scroll indicators (▶ for more)
- Infinite scroll as user scrolls down

**Carousel Categories**:
- Featured Movies
- Drama Series
- Action & Adventure
- Comedy Shows
- New Releases
- Top Rated
- Documentaries
- Kids
- (more based on user preferences)

---

## Screen 6: VOD Content Detail

```
┌─────────────────────────────────┐
│ ◄ VOD                           │
│                                 │
│  ╔═════════════════════════╗    │
│  ║                         ║    │
│  ║   [Content Poster]      ║    │
│  ║                         ║    │
│  ║                         ║    │
│  ║   Movie Title           ║    │
│  ║   Director: Name        ║    │
│  ║   Cast: Actor 1, 2, 3   ║    │
│  ║   9.2 ⭐ (12.5K votes) ║    │
│  ╚═════════════════════════╝    │
│                                 │
│ 2h 15m | Action | 2024 | R     │
│ Hebrew | English | Spanish      │
│                                 │
│ SYNOPSIS:                       │
│ "An epic adventure that takes   │
│  heroes across treacherous      │
│  lands to save the kingdom..."  │
│                                 │
│ ┌──────────────────────────┐   │
│ │ ▶ PLAY                   │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ ⬇️  DOWNLOAD              │   │
│ └──────────────────────────┘   │
│                                 │
│ ♥ ADD TO FAVORITES             │
│ 🔗 SHARE                        │
│                                 │
│ EPISODES (Season 1):            │
│ ┌──────────────────────────┐   │
│ │ 1. Pilot        (1:25)   │   │
│ │ 2. Chapter 2    (1:30)   │   │
│ │ 3. Revelation   (1:28)   │   │
│ │ 4. Turning Point(1:32)   │   │
│ └──────────────────────────┘   │
│                                 │
│ SIMILAR CONTENT:                │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ │[🎬]│ │[🎬]│ │[🎬]│            │
│ │ 8.9│ │ 8.7│ │ 8.3│            │
│ └────┘ └────┘ └────┘            │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Back navigation (◄)
- Large poster/banner image
- Title and metadata
- Rating with vote count
- Duration, genre, year, rating category
- Available languages
- Synopsis (expandable)
- Play button (primary action)
- Download button
- Add to favorites
- Share button
- Episodes list (for series)
- Similar content carousel

---

## Screen 7: Downloads Screen

```
┌─────────────────────────────────┐
│ ◄ DOWNLOADS                     │
├─────────────────────────────────┤
│                                 │
│ Storage: 5.2 GB / 10 GB         │
│ ████████░░ 52%                  │
│                                 │
│ ACTIVE DOWNLOADS (2)             │
│                                 │
│ ┌──────────────────────────┐   │
│ │ Movie Title              │   │
│ │ 2.4 GB / 4.2 GB (57%)   │   │
│ │ ████████░░░░ 57%        │   │
│ │ Speed: 5.2 MB/s         │   │
│ │ ETA: 8 minutes          │   │
│ │ [⏸ PAUSE] [❌ CANCEL]   │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ Series Episode 5         │   │
│ │ 1.8 GB / 2.1 GB (86%)   │   │
│ │ ████████████░ 86%       │   │
│ │ Speed: 3.8 MB/s         │   │
│ │ ETA: 2 minutes          │   │
│ │ [⏸ PAUSE] [❌ CANCEL]   │   │
│ └──────────────────────────┘   │
│                                 │
│ DOWNLOADED CONTENT (8)           │
│                                 │
│ ┌──────────────────────────┐   │
│ │ ✓ Movie 1          (4.2GB)  │   │
│ │ ▶ PLAY  ⬇️ RE-DL  🗑️     │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ ✓ Episode: Chapter 1    (2GB)  │   │
│ │ ▶ PLAY  ⬇️ RE-DL  🗑️     │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ ✓ Podcast: Latest (520MB)     │   │
│ │ ▶ PLAY  ⬇️ RE-DL  🗑️     │   │
│ └──────────────────────────┘   │
│                                 │
│ [Show more...] 5 more items     │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- Storage quota display with bar
- Active downloads section with progress
- Download speed display
- Estimated time remaining (ETA)
- Pause/cancel buttons
- Downloaded content section
- Play, re-download, delete options
- Smooth progress animation

**Download Features**:
- Real-time speed calculation
- Pause/resume functionality
- Cancel with cleanup
- Offline playback verification
- Storage quota warnings
- Background download support

---

## Screen 8: Profile Screen

```
┌─────────────────────────────────┐
│ 🏠 HOME    📺 LIVETV  📼 VOD    │
│ 📻 RADIO   🎙️ PODCASTS 👤 ME   │
├─────────────────────────────────┤
│                                 │
│      👤  User Avatar            │
│      John Doe                   │
│      john@example.com           │
│      Premium Member ✓           │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🎬 WATCHLIST (12 items)         │
│    [Thumbnail] [Thumbnail] ...  │
│                                 │
│ ♥️  FAVORITES (24 items)        │
│    [Thumbnail] [Thumbnail] ...  │
│                                 │
│ ⬇️  DOWNLOADS (8 items)         │
│    [Thumbnail] [Thumbnail] ...  │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ ACCOUNT & SETTINGS              │
│                                 │
│ • Profile Settings              │
│ • Account Preferences           │
│ • Language: English ▼           │
│ • Subtitles: On ▼              │
│ • Playback Quality: Auto ▼     │
│                                 │
│ • Notifications Settings        │
│ • Security & Biometric         │
│ • Privacy Policy               │
│ • Help & Support               │
│ • About App (v1.0.0)           │
│                                 │
│ 🚪 LOGOUT                       │
│                                 │
└─────────────────────────────────┘
```

**Elements**:
- User profile header (avatar, name, email, membership status)
- Quick access sections (Watchlist, Favorites, Downloads)
- Account and settings options
- Language selector
- Notification preferences
- Security settings
- Help and support
- Logout button

---

## Screen 9: Settings - Language Selection

```
┌─────────────────────────────────┐
│ ◄ LANGUAGE SETTINGS             │
├─────────────────────────────────┤
│                                 │
│ SELECT APP LANGUAGE             │
│                                 │
│ ○ English               (Selected)│
│   Current Language              │
│                                 │
│ ○ עברית (Hebrew)        (RTL)   │
│   Right-to-Left Layout          │
│                                 │
│ ○ Español (Spanish)             │
│                                 │
│ ○ 中文 (Chinese)                 │
│                                 │
│ ○ Français (French)             │
│                                 │
│ ○ Italiano (Italian)            │
│                                 │
│ ○ हिन्दी (Hindi)                 │
│                                 │
│ ○ தமிழ் (Tamil)                 │
│                                 │
│ ○ বাংলা (Bengali)               │
│                                 │
│ ○ 日本語 (Japanese)              │
│                                 │
│                                 │
│ Language will change in 2s...   │
│                                 │
└─────────────────────────────────┘
```

**Features**:
- 10 supported languages
- Current language highlighted
- RTL indicator for Hebrew
- Automatic layout switch
- Language persistence via AsyncStorage
- Instant UI language update

---

## Screen 10: Video Player with Live Dubbing

```
┌─────────────────────────────────┐
│                                 │
│  ╔═════════════════════════╗    │
│  ║  [VIDEO PLAYING]        ║    │
│  ║   Original + Dubbed     ║    │
│  ║                         ║    │
│  ║  🔊 Volume: ▶████░░░░  ║    │
│  ║     Original (English)  ║    │
│  ║     ▶████░░░░ 80%       ║    │
│  ║                         ║    │
│  ║  🔊 Volume: ▶███░░░░░  ║    │
│  ║     Dubbed (Hebrew)     ║    │
│  ║     ▶███░░░░░ 30%       ║    │
│  ║                         ║    │
│  ║  [Mix: ▶██░░] 60/40    ║    │
│  ║                         ║    │
│  ║  Balance Volume Controls║    │
│  ║  [100%] [80%] [OFF]     ║    │
│  ║                         ║    │
│  ╚═════════════════════════╝    │
│                                 │
│  🔊 AUDIO TRACKS:               │
│  ☑ Original (English) [🔊 80%]  │
│  ☑ Dubbed (Hebrew)   [🔊 30%]  │
│                                 │
│  BALANCE:                       │
│  Original ◄────●────► Dubbed   │
│                                 │
│  [SAVE PREFERENCES]             │
│                                 │
└─────────────────────────────────┘
```

**Live Dubbing Features**:
- Dual audio track selection
- Independent volume control for each track
- Balance slider for mix
- Real-time volume adjustment
- Settings persistence
- Smooth audio switching

---

## Screen 11: Accessibility Features

```
┌─────────────────────────────────┐
│ ◄ ACCESSIBILITY                 │
├─────────────────────────────────┤
│                                 │
│ SCREEN READER                   │
│ ☑ TalkBack Support              │
│   All buttons labeled with      │
│   accessibility descriptions    │
│                                 │
│ TEXT SIZE                        │
│ Small  ◄────●────› Large       │
│  12pt        14pt        18pt    │
│  Normal   Current   Large        │
│                                 │
│ COLOR & CONTRAST                │
│ ☑ High Contrast Mode (4.5:1)   │
│ ☑ Enable Color Filter           │
│ ○ Normal                        │
│ ○ Deuteranopia (Red-Green)      │
│ ○ Protanopia (Red Blind)        │
│ ○ Tritanopia (Blue-Yellow)      │
│                                 │
│ TOUCH TARGETS                   │
│ Minimum: 44×44 dp ✓             │
│ Recommended: 48×48 dp ✓         │
│                                 │
│ CAPTIONS & SUBTITLES            │
│ ☑ Always Show Subtitles         │
│ • Caption Size: Medium          │
│ • Caption Color: White on Black │
│ • Caption Background: Black     │
│ • Caption Opacity: 80%          │
│                                 │
│ KEYBOARD NAVIGATION             │
│ ☑ Enable Tab Navigation         │
│ ◆ Focus Indicator: Visible      │
│   All interactive elements      │
│   navigable via keyboard        │
│                                 │
│ AUDIO DESCRIPTIONS              │
│ ☑ Enable Audio Descriptions    │
│   Additional narrator track     │
│   describing visual elements    │
│                                 │
└─────────────────────────────────┘
```

**Accessibility Features Verified**:
- ✅ Screen reader support (TalkBack)
- ✅ Adjustable text size (12-24pt)
- ✅ High contrast mode (4.5:1 minimum)
- ✅ Color blindness filters
- ✅ 44×44 dp touch targets
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Captions and subtitles
- ✅ Audio descriptions

---

## Design System

### Color Palette
```
Primary Colors:
• Background Dark:   #0a0e27 (glassmorphism background)
• Glass Layer:       rgba(255, 255, 255, 0.1) with backdrop-blur
• Text Primary:      #ffffff (white)
• Text Secondary:    #b0b0b0 (light gray)

Accent Colors:
• Primary Action:    #ff006e (brand pink/red)
• Success:          #00d84f (green)
• Warning:          #ffc107 (yellow)
• Error:            #ff5252 (red)

Video Controls:
• Play Button:      #00d84f (green)
• Pause Button:     #ff006e (red)
• Progress Filled:  #00d84f (green)
• Progress Empty:   #666666 (dark gray)
```

### Typography
```
Headings (32pt, bold):
  Screen titles, main content headers

Subheadings (20pt, semibold):
  Section titles, card titles

Body Text (14pt, regular):
  Main content, descriptions

Small Text (12pt, regular):
  Secondary info, timestamps

Monospace (12pt, code):
  Technical info, time codes
```

### Spacing (8dp grid)
```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
xxl: 48px
```

### Touch Targets
```
Minimum: 44×44 dp (WCAG 2.1 AA)
Recommended: 48×48 dp (WCAG 2.1 AAA)
Large: 56×56 dp (for elderly users)
```

---

## Expected Behavior

### Navigation Flow
```
Login → Home → [Tabs] → Content Detail → Player
                              ↓
                          Download
                          Episodes
                          Similar

Tabs:
  Home → Featured + Recommended
  LiveTV → Live Channels + EPG
  VOD → Content Grid + Search
  Radio → Radio Stations
  Podcasts → Podcast Episodes
  Profile → User Account + Settings
```

### Gestures Supported
```
Tap:             Select content, toggle controls
Double Tap:      Play/pause video
Long Press:      Context menu (share, add to favorites)
Swipe Left/Right: Seek forward/backward in video
Swipe Up/Down:   Scroll content lists
Pinch Zoom:      Zoom in/out on images
Drag:            Reorder items in lists
```

### Network Behavior
```
WIFI:          Instant load, 4K quality available
FAST_4G:       Fast load, 1080p quality
SLOW_4G:       Buffering indicator, 720p quality
EDGE:          Heavy buffering, 480p quality
OFFLINE:       Downloaded content only, offline indicator
```

---

## Performance Expectations

```
Screen Load Times:
  Home Screen:        < 500ms (after login)
  Video Player:       < 3000ms (video playing)
  Navigation Tab:     < 300ms (tab switch)

Memory Usage:
  Idle:               180-220 MB
  Video Playing:      280-320 MB
  Multiple Videos:    350 MB (peak)

Frame Rate:
  UI Navigation:      60 FPS (smooth)
  Video Playback:     60 FPS (consistent)
  Scrolling:          60 FPS (no jank)
```

---

## Notes for QA Team

When testing on emulator, verify:

✅ All interactive elements have 44×44 dp minimum touch targets
✅ Text has 4.5:1 contrast ratio minimum
✅ Video player shows playback controls within 300ms of tap
✅ Quality switching completes within 1 second
✅ Subtitles sync with video (< 100ms latency)
✅ Audio tracks switch without audio dropout
✅ Downloads resume after pause
✅ Language switching applies immediately
✅ RTL layout correct for Hebrew
✅ No visual glitches on screen orientation changes

---

This document provides visual guidance for the expected UI layouts. Actual screenshots will be captured when the app runs on an emulator.
