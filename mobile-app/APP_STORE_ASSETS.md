# App Store Assets Guide

Complete guide for creating and submitting App Store assets for Bayit+ iOS mobile app.

## Required Assets Checklist

### App Icon
- [x] 1024x1024 PNG (no alpha channel)
- [ ] Design created
- [ ] Exported at correct size
- [ ] Uploaded to App Store Connect

### Screenshots

#### iPhone 6.7" (iPhone 14 Pro Max) - REQUIRED
- [ ] Screenshot 1: Home Screen with featured content
- [ ] Screenshot 2: PiP widget in action
- [ ] Screenshot 3: Voice command with waveform
- [ ] Screenshot 4: Search results (Hebrew content)
- [ ] Screenshot 5: Player screen with live TV

#### iPhone 6.5" (iPhone 11 Pro Max) - OPTIONAL
- [ ] Screenshot 1-5 (same as above)

#### iPad Pro 12.9" (6th gen) - REQUIRED for iPad support
- [ ] Screenshot 1: Home Screen (multi-column layout)
- [ ] Screenshot 2: Multiple PiP widgets
- [ ] Screenshot 3: Voice command interface
- [ ] Screenshot 4: Landscape mode
- [ ] Screenshot 5: Search and player

### App Preview Video (Optional but Recommended)
- [ ] 30-second video created
- [ ] Uploaded to App Store Connect

---

## App Icon Design

### Requirements
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency)
- **Safe area**: Keep content within 90% center (avoid corners being clipped)
- **Design**: Bayit+ logo on gradient background

### Design Specifications

```
Background: Linear gradient
  - Top: #8a2be2 (Purple)
  - Bottom: #4a148c (Deep Purple)

Logo: Bayit+ in white
  - Font: SF Pro Display Bold
  - Size: 400px height
  - Position: Centered
  - Drop shadow: 0px 8px 16px rgba(0,0,0,0.3)

Icon style: Modern, glassmorphism
  - Subtle glass effect overlay
  - Gradient mesh background
  - Rounded square (iOS will apply corner radius)
```

### Design Tools
- **Figma**: https://figma.com (recommended)
- **Sketch**: For Mac designers
- **Adobe Illustrator**: Professional design tool
- **Canva**: Simple online tool

### Export Settings
```
Resolution: 1024x1024 pixels
Format: PNG-24
Color mode: RGB
Compression: None
Alpha channel: Removed (must be opaque)
```

---

## Screenshots Specifications

### iPhone 6.7" (1290 x 2796 pixels)

**Screenshot 1: Home Screen**
- Show: Featured content cards, voice button visible
- Highlight: "Watch Channel 13 Live" as first card
- Language: Hebrew (RTL layout)
- Status bar: Clean (9:41 AM, full battery, full signal)

**Screenshot 2: PiP Widget in Action**
- Show: Widget floating over content
- Widget content: Channel 13 News playing
- Widget position: Top-right corner
- Highlight: Draggable, resizable widget
- Status: "Live" badge visible

**Screenshot 3: Voice Command Interface**
- Show: Voice button activated (blue glow)
- Waveform: Animated bars visible
- Transcript: "Play Channel 13" displayed
- TTS response: "Playing Channel 13 News"
- Background: Blurred home screen

**Screenshot 4: Search Results (Hebrew)**
- Show: Search screen with Hebrew query "קומדיה"
- Results: 6-8 comedy show cards
- Language: All Hebrew text
- Highlight: Voice search button

**Screenshot 5: Player Screen**
- Show: Live TV player (Channel 13)
- Video: News broadcast screenshot
- Controls: Play/pause, volume, subtitles
- Info: Channel logo, program title, time

### iPad Pro 12.9" (2048 x 2732 pixels)

**Screenshot 1: Home Screen (Multi-column)**
- Show: 3-column grid layout
- Content: Featured shows, live channels, podcasts
- Sidebar: Optional navigation (if implemented)
- Landscape orientation

**Screenshot 2: Multiple PiP Widgets**
- Show: 2 widgets visible (Channel 13 + Radio Galatz)
- Layout: One in top-right, one in bottom-left
- Background: Content browsing screen
- Highlight: Multi-tasking capability

**Screenshot 3: Voice Command**
- Show: Large voice interface (iPad optimized)
- Waveform: Full-width animated visualization
- Transcript: Hebrew voice command
- Keyboard: Visible below (optional text input)

**Screenshot 4: Landscape Mode**
- Show: Full landscape layout
- Content: Video player in landscape
- Widgets: Minimized to bottom bar
- Controls: Landscape-optimized playback controls

**Screenshot 5: Search and Player**
- Show: Split view with search on left, player on right
- iPad feature: Multitasking view
- Content: Search results + playing video

---

## Screenshot Creation Process

### Method 1: iOS Simulator (Recommended)

1. **Open Xcode simulator**
   ```bash
   xcodebuild -showsdks  # List available simulators
   open -a Simulator
   ```

2. **Select device**
   - iPhone 14 Pro Max (6.7")
   - iPad Pro 12.9" (6th gen)

3. **Run app**
   ```bash
   react-native run-ios --simulator="iPhone 14 Pro Max"
   ```

4. **Navigate to screen**
   - Open specific screen you want to capture
   - Ensure content is loaded
   - Set up widgets if needed

5. **Capture screenshot**
   - Cmd+S in simulator
   - Saves to Desktop as PNG
   - Or use Cmd+Shift+4 for manual crop

6. **Clean up screenshot**
   - Remove status bar issues
   - Ensure time is 9:41 AM
   - Full battery, full signal

### Method 2: Physical Device

1. **Connect iPhone/iPad**
2. **Run app on device**
3. **Navigate to screen**
4. **Take screenshot**
   - iPhone: Side button + Volume Up
   - iPad: Top button + Volume Up
5. **AirDrop to Mac**
6. **Edit in Preview/Photoshop**

### Screenshot Editing Checklist

For each screenshot:
- [ ] Clean status bar (9:41 AM, full battery, full signal)
- [ ] No personal information visible
- [ ] High quality (no blur, compression artifacts)
- [ ] Correct orientation (portrait/landscape)
- [ ] Proper resolution (exact pixel dimensions)
- [ ] Content appropriate (no mature content in screenshots)
- [ ] Text is readable
- [ ] Colors look good (not washed out)

---

## App Preview Video

### Video Specifications
- **Duration**: 15-30 seconds
- **Resolution**: 1920x1080 (1080p) minimum
- **Format**: .mov or .mp4
- **Codec**: H.264
- **Frame rate**: 30fps
- **Orientation**: Portrait (iPhone) or Landscape (iPad)

### Video Storyboard

**0-5 seconds: Introduction**
- Show app icon
- Title: "Bayit+ - Israeli Content Streaming"
- Subtitle: "Voice-First Experience"

**5-10 seconds: Wake Word Demo**
- Show user saying "Hey Bayit"
- App activates with blue glow
- Waveform appears

**10-15 seconds: Voice Command**
- User says: "Play Channel 13"
- App responds: "Playing Channel 13 News"
- Player opens with live stream

**15-20 seconds: PiP Widget**
- User drags widget around screen
- Widget snaps to edge
- User continues browsing while watching

**20-25 seconds: Siri Integration**
- Show Siri command: "Play Galatz Radio on Bayit Plus"
- App opens and starts playing

**25-30 seconds: Closing**
- Show multiple features: Widgets, Voice, CarPlay icons
- Title: "Download Now"
- App Store button

### Video Creation Tools
- **ScreenFlow** (Mac): Professional screen recording
- **iMovie** (Mac/iOS): Simple video editing
- **Final Cut Pro** (Mac): Professional editing
- **Adobe Premiere** (Cross-platform): Advanced editing

### Recording Tips
- Use 1080p or higher resolution
- Record in good lighting
- Disable notifications during recording
- Use demo account with clean data
- Add voiceover or captions
- Background music (royalty-free only)
- Export at highest quality

---

## App Store Copy

### App Name
**English**: Bayit+
**Hebrew**: בית+ (Bayit+)

### Subtitle (30 characters max)
**English**: Israeli Content Streaming
**Hebrew**: פלטפורמת הסטרימינג הישראלית

### Description (4000 characters max)

**English**:

```
Bayit+ is Israel's premier voice-first streaming platform, bringing you the best of Israeli television, radio, podcasts, and on-demand content - all controlled by your voice.

VOICE-FIRST EXPERIENCE
• Wake word activation: Just say "Hey Bayit" to start
• Natural language commands in Hebrew, English, and Spanish
• Hands-free control while multitasking
• Proactive AI suggestions based on your preferences

PICTURE-IN-PICTURE WIDGETS
• Floating video widgets you can drag and resize
• Watch live TV while browsing other content
• Multiple widgets at once on iPad
• Smart edge snapping for easy positioning

LIVE CHANNELS
• Channel 13, Channel 12, Kan 11
• News, entertainment, sports, and more
• Live schedules and program guides
• Quick access to favorite channels

PODCASTS & RADIO
• היסטוריה של יום אחד (History of One Day)
• השבוע עם מיכאל שילה (The Week with Michael Shiloh)
• Live radio: Galatz, Galei Tzahal, Kol Rega
• Background playback and downloads

IOS INTEGRATION
• Siri Shortcuts: "Play Channel 13 on Bayit Plus"
• Home Screen Widgets for quick access
• CarPlay support for audio content
• SharePlay for watching together

SMART FEATURES
• Multi-turn conversations: "Play that", "Show more like this"
• Emotional intelligence: Adapts responses to your mood
• Morning Ritual: Personalized morning content
• Hebrew RTL support

SUBSCRIPTION
• Free trial available
• Premium features: HD streaming, offline downloads, ad-free
• Cancel anytime

Download Bayit+ today and experience the future of Israeli content streaming.

Support: support@bayit.tv
Privacy Policy: https://bayit.tv/privacy
Terms: https://bayit.tv/terms
```

**Hebrew**:

```
בית+ היא פלטפורמת הסטרימינג הישראלית המובילה עם שליטה קולית מלאה. כל התכנים הישראליים האהובים עליכם - טלוויזיה, רדיו, פודקאסטים ועוד - בשליטה קולית טבעית.

חוויה קולית מובילה
• הפעלה באמצעות מילת הקוף: פשוט אמרו "היי בית"
• פקודות בשפה טבעית בעברית, אנגלית וספרדית
• שליטה בדיבור תוך כדי ביצוע משימות אחרות
• המלצות AI פרואקטיביות המותאמות אישית

ווידג'טים צפים
• ווידג'טי וידאו צפים שניתן לגרור ולשנות גודל
• צפייה בטלוויזיה חיה תוך כדי גלישה בתכנים אחרים
• מספר ווידג'טים בו-זמנית באייפד
• הצמדה אוטומטית לקצוות המסך

ערוצים חיים
• ערוץ 13, ערוץ 12, כאן 11
• חדשות, בידור, ספורט ועוד
• לוח שידורים ומדריך תוכניות
• גישה מהירה לערוצים מועדפים

פודקאסטים ורדיו
• היסטוריה של יום אחד
• השבוע עם מיכאל שילה
• רדיו חי: גלצ, גלי צה"ל, קול רגע
• השמעה ברקע והורדות

אינטגרציה עם iOS
• קיצורי דרך של Siri: "תפעיל ערוץ 13 בבית פלוס"
• ווידג'טים למסך הבית
• תמיכה ב-CarPlay לתכני אודיו
• SharePlay לצפייה משותפת

פיצ'רים חכמים
• שיחות רב-תוריות: "תפעיל את זה", "תראה עוד כאלה"
• אינטליגנציה רגשית: מתאים את התגובות למצב הרוח שלך
• טקס בוקר: תוכן בוקר מותאם אישית
• תמיכה מלאה בעברית (RTL)

מנוי
• תקופת ניסיון בחינם
• פיצ'רים פרימיום: סטרימינג HD, הורדות, ללא פרסומות
• ביטול בכל עת

הורידו את בית+ עוד היום וחוו את עתיד הסטרימינג הישראלי.

תמיכה: support@bayit.tv
מדיניות פרטיות: https://bayit.tv/privacy
תנאי שימוש: https://bayit.tv/terms
```

### Keywords (100 characters max, comma-separated)

**English**:
```
streaming,live tv,israeli,voice control,podcasts,radio,carplay,siri,hebrew,channel 13
```

**Hebrew**:
```
סטרימינג,טלוויזיה,שידור חי,פודקאסטים,רדיו,ערוץ 13,קול,עברית
```

### What's New (4000 characters max)

**Version 1.0 - Initial Release**:

```
Welcome to Bayit+ - Israel's first voice-first streaming platform!

🎙️ VOICE FEATURES
• Wake word activation: "Hey Bayit"
• Natural language commands in Hebrew, English, Spanish
• Proactive AI suggestions
• Emotional intelligence

📺 CONTENT
• Live channels: 13, 12, Kan 11
• 100+ podcasts
• Live radio stations
• On-demand shows

🪟 PIP WIDGETS
• Floating video widgets
• Drag, resize, minimize
• Multiple widgets on iPad

🍎 iOS INTEGRATION
• Siri Shortcuts
• Home Screen Widgets
• CarPlay support
• SharePlay

Thank you for downloading Bayit+!
```

---

## Privacy Policy & Terms

### Privacy Policy Requirements

Must include:
- Data collection practices
- Microphone usage (voice commands)
- Speech recognition (on-device, not stored)
- Analytics (if using Firebase, etc.)
- Third-party services
- User rights (GDPR, CCPA compliance)
- Contact information

**Location**: https://bayit.tv/privacy-mobile

### Terms of Service

Must include:
- Usage terms
- Subscription terms (if applicable)
- Content licensing
- Acceptable use policy
- Disclaimer of warranties
- Contact information

**Location**: https://bayit.tv/terms

---

## App Store Connect Setup

### 1. Create App Record

1. Log in to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: Bayit+
   - Primary Language: Hebrew
   - Bundle ID: tv.bayit.plus (must match Xcode)
   - SKU: bayit-plus-ios-001

### 2. App Information

- **Category**: Entertainment
- **Secondary Category**: News (optional)
- **Content Rights**: Check if you own or have rights to content
- **Age Rating**: 12+ (or as appropriate)
- **Copyright**: © 2026 Bayit Plus Ltd.
- **Privacy Policy URL**: https://bayit.tv/privacy
- **Terms of Service URL**: https://bayit.tv/terms

### 3. Pricing & Availability

- **Price**: Free
- **In-App Purchases**: Yes (if subscriptions)
- **Availability**: Israel, United States (expand later)
- **Pre-order**: No

### 4. App Privacy

Data Types Collected:
- ✅ Contact Info: Email address
- ✅ Usage Data: Viewing history, search queries
- ✅ Diagnostics: Crash logs, performance data

Data Linked to User: Yes
Data Used to Track: No

### 5. Build Upload

1. Archive app in Xcode (Product → Archive)
2. Select archive → Distribute App
3. App Store Connect → Upload
4. Wait 15-30 minutes for processing
5. Select build in App Store Connect

### 6. Submit for Review

1. Fill in all required fields
2. Upload all screenshots
3. Upload app preview video (optional)
4. Add reviewer notes (see below)
5. Click "Submit for Review"

---

## Reviewer Notes Template

```
Dear App Review Team,

Thank you for reviewing Bayit+, Israel's premier voice-first streaming platform.

TEST ACCOUNT:
Email: reviewer@bayit.tv
Password: BayitReview2026!

VOICE FEATURES TESTING:
1. Tap the microphone button (bottom-right) to activate voice
2. Say "Hey Bayit" for wake word activation (may need permission grant first)
3. Try these commands:
   - English: "Play Channel 13"
   - Hebrew: "תפתח ערוץ 13"
   - "Show podcasts"
   - "Search for comedy"

PIP WIDGETS:
1. Browse to Home → Tap any content card → "Add Widget"
2. Drag widget around screen
3. Pinch to resize
4. Double-tap to minimize

CARPLAY (if entitlement approved):
1. Connect to CarPlay simulator (I/O → External Displays → CarPlay)
2. Open Bayit+ in CarPlay
3. Test audio playback (radio, podcasts)

SIRI SHORTCUTS:
1. Say: "Hey Siri, play Channel 13 on Bayit Plus"
2. Works after using feature 2-3 times in app

HOME SCREEN WIDGETS:
1. Long press Home Screen → "+"
2. Search "Bayit+"
3. Add widget to Home Screen

HEBREW LANGUAGE:
1. Settings → Language → עברית (Hebrew)
2. UI switches to RTL layout
3. Voice commands work in Hebrew

DEMO VIDEO:
https://bayit.tv/demo-video.mp4

NOTES:
- Microphone permission required for voice features
- Speech recognition permission required
- Some content may be geo-restricted to Israel

If you have any questions:
support@bayit.tv
+972-XX-XXX-XXXX

Thank you!
```

---

## Checklist Before Submission

### Code & Build
- [ ] Release build created
- [ ] Code signing configured
- [ ] Version number: 1.0.0
- [ ] Build number: 1
- [ ] All warnings fixed
- [ ] No crashes in testing

### Assets
- [ ] App icon uploaded (1024x1024)
- [ ] iPhone screenshots (5x at 1290x2796)
- [ ] iPad screenshots (5x at 2048x2732)
- [ ] App preview video (optional)

### Metadata
- [ ] App name and subtitle
- [ ] Description (English + Hebrew)
- [ ] Keywords
- [ ] What's New text
- [ ] Support URL
- [ ] Marketing URL
- [ ] Privacy Policy URL
- [ ] Terms of Service URL

### Testing
- [ ] Tested on iPhone (physical device)
- [ ] Tested on iPad (physical device)
- [ ] All voice commands work
- [ ] All screens accessible
- [ ] No crashes
- [ ] Performance acceptable

### App Store Connect
- [ ] App Information complete
- [ ] Pricing configured
- [ ] Privacy information submitted
- [ ] Build selected
- [ ] Reviewer notes added
- [ ] Test account provided

### Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Content rights secured
- [ ] Age rating appropriate

---

## Post-Submission

### Review Timeline
- Initial review: 24-48 hours
- Total time: 3-7 days typical
- Expedited review: 1-2 days (request if urgent)

### If Approved
- [ ] Monitor crash reports
- [ ] Respond to user reviews
- [ ] Track analytics
- [ ] Plan v1.1 updates

### If Rejected
- [ ] Read rejection reason
- [ ] Fix issues mentioned
- [ ] Reply to reviewer
- [ ] Resubmit

---

## Tools & Resources

### Design Tools
- Figma: https://figma.com
- Sketch: https://sketch.com
- Adobe Creative Cloud: https://adobe.com

### Screenshot Tools
- Xcode Simulator: Built-in
- ScreenFlow: Screen recording (Mac)
- Fastlane: Automated screenshots

### Testing Tools
- TestFlight: Beta testing
- Xcode Instruments: Performance profiling
- Accessibility Inspector: VoiceOver testing

### Apple Resources
- App Store Connect: https://appstoreconnect.apple.com
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines
