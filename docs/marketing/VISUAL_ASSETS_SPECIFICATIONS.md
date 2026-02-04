# Bayit+ tvOS Visual Assets Specifications

**Project**: Bayit+ Apple TV Launch
**Date**: 2026-02-04
**Designer Deliverables**: App Store screenshots, social media graphics, promotional materials

---

## 1. App Store Screenshots (REQUIRED)

### Technical Requirements

**Platform**: Apple TV (tvOS)
**Resolution**: 1920 x 1080 pixels (16:9 aspect ratio)
**Format**: PNG or JPEG (PNG recommended for quality)
**Color Space**: sRGB
**Quantity**: Minimum 1, Maximum 5 (we're creating 5)

### Screenshot 1: Hero - Live TV with AI Dubbing

**Composition**:
- Background: Live Channel 12 news broadcast (wide shot of news desk)
- Overlay: Frosted glass panel showing AI dubbing controls
- Elements to include:
  - "LIVE" indicator (top-left, red badge)
  - Channel 12 logo (top-right)
  - Audio waveform visualization (showing Hebrew → English translation)
  - Language selector dropdown: "Hebrew → English"
  - Dubbing indicator: "AI Dubbing Active"
  - Latency indicator: "<2s delay"

**Typography**:
- Title: "Real-Time AI Dubbing" (Heebo Bold, 72pt, white)
- Subtitle: "Watch Israeli TV in Your Language" (Heebo Regular, 36pt, white 80% opacity)

**Color Palette**:
- Primary: #1E40AF (Bayit+ blue)
- Accent: #10B981 (success green for "live")
- Glass: rgba(255, 255, 255, 0.1) with backdrop blur
- Text: White with drop shadow for readability

**Layout**:
```
┌─────────────────────────────────────────┐
│ [LIVE]              [Channel 12 Logo]   │
│                                          │
│          NEWS BROADCAST VIDEO            │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │   Real-Time AI Dubbing           │   │
│  │   Hebrew → English               │   │
│  │   [Waveform visualization]       │   │
│  │   <2s delay | AI Dubbing Active  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Notes for Designer**:
- Use actual news broadcast footage if available
- Glassmorphism effect on control panel (frosted glass with subtle border)
- Ensure text is readable over video (use drop shadows)
- Keep UI elements Apple TV-sized (10-foot viewing)

---

### Screenshot 2: Smart Context Card

**Composition**:
- Background: Israeli drama scene (characters in conversation)
- Overlay: Context card appearing to explain a character
- Elements to include:
  - Character photo (circular, 120px diameter)
  - Character name in Hebrew and English
  - Role/title
  - Brief bio (2-3 lines)
  - "Powered by AI" badge (bottom-right of card)
  - Subtle entrance animation indicator

**Typography**:
- Card title: "Benjamin Netanyahu" (Heebo Bold, 48pt)
- Subtitle: "Prime Minister of Israel" (Heebo Regular, 32pt)
- Body: Bio text (Heebo Regular, 24pt, white 80%)

**Color Palette**:
- Card background: rgba(0, 0, 0, 0.8) with backdrop blur
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Accent: #3B82F6 (blue for AI badge)

**Layout**:
```
┌─────────────────────────────────────────┐
│                                          │
│      DRAMA SCENE (slightly blurred)     │
│                                          │
│        ┌─────────────────────────┐      │
│        │  [Photo]                │      │
│        │  Benjamin Netanyahu     │      │
│        │  Prime Minister         │      │
│        │  Bio text explaining... │      │
│        │          [AI Badge]     │      │
│        └─────────────────────────┘      │
│                                          │
└─────────────────────────────────────────┘
```

**Notes for Designer**:
- Context card should use glassmorphism (dark glass with blur)
- Position card in lower-third for TV viewing comfort
- Ensure contrast against scene background
- Use actual Israeli TV show footage if possible
- Add subtle shadow around card for depth

---

### Screenshot 3: Visual Sync Technology

**Composition**:
- Split-screen layout (60/40 split)
- Left (60%): Large TV screen showing Israeli content
- Right (40%): iPhone with Bayit+ app showing sync interface
- Center: Animated sync lines connecting devices

**Elements**:
- TV screen: Israeli talk show or news
- iPhone screen: Bayit+ app with "Syncing..." indicator
- Sync animation: Pulsing waves connecting TV to phone
- Family in background (silhouetted, watching together)

**Typography**:
- Title: "Visual Sync" (Heebo Bold, 84pt, white)
- Subtitle: "Personal Audio, Shared Experience" (Heebo Regular, 42pt)

**Color Palette**:
- Sync animation: Gradient from #3B82F6 to #8B5CF6 (blue to purple)
- Glow effect around connection lines
- iPhone screen: Use actual app UI

**Layout**:
```
┌─────────────────────────────────────────┐
│                                          │
│  ┌─────────────────┐    ┌──────────┐    │
│  │                 │    │  iPhone  │    │
│  │   TV Screen     │~~~~│  Syncing │    │
│  │   (Israeli TV)  │~~~~│  Audio   │    │
│  │                 │    │          │    │
│  └─────────────────┘    └──────────┘    │
│                                          │
│         Visual Sync Technology           │
│    Personal Audio, Shared Experience     │
└─────────────────────────────────────────┘
```

**Notes for Designer**:
- Use motion blur on sync lines to show animation
- iPhone should show actual Bayit+ sync interface
- Living room setting with warm, inviting lighting
- Emphasize the "magic" of the sync with glow effects

---

### Screenshot 4: Content Library

**Composition**:
- Full-screen grid of content thumbnails
- 4 rows x 4 columns (16 items total)
- Category headers above sections
- Navigation focus indicator on one item

**Elements**:
- High-quality movie/show posters
- Category labels: "Movies", "Live TV", "Podcasts", "Series"
- Badges on select items: "4K HDR", "AI Enhanced", "New"
- Apple TV focus indicator (white glow around selected item)

**Typography**:
- Category headers: (Heebo Bold, 48pt, white)
- Title overlay: "Thousands of Hours of Content" (Heebo Bold, 64pt)

**Color Palette**:
- Background: Dark gradient (black to dark blue)
- Focus indicator: White glow with blur
- Badges: Gold for "4K", Blue for "AI", Green for "New"

**Layout**:
```
┌─────────────────────────────────────────┐
│  Thousands of Hours of Content          │
│                                          │
│  Movies                                  │
│  [📽️][📽️][📽️][📽️]                   │
│                                          │
│  Live TV                                 │
│  [📺][📺][📺][📺]                       │
│                                          │
│  Podcasts                                │
│  [🎙️][🎙️][🎙️][🎙️]                   │
│                                          │
│  Series                                  │
│  [📺][📺][📺][📺]                       │
└─────────────────────────────────────────┘
```

**Notes for Designer**:
- Use real content posters from Bayit+ library
- Ensure posters are high-resolution
- Apply subtle parallax effect to focused item
- Add depth with shadows under thumbnails
- Show diversity of content (various genres, languages)

---

### Screenshot 5: Beta 500 Offer

**Composition**:
- Centered promotional graphic
- Apple TV device mockup
- Large "500" number as focal point
- List of benefits
- Call-to-action button

**Elements**:
- Apple TV 4K device image (3D render or photo)
- Large "500" with gradient/glow effect
- Checkmark list of features
- "Join Beta" CTA button
- Bayit+ logo
- "Limited to first 500 users" disclaimer

**Typography**:
- "500": (Heebo Black, 180pt, gradient gold/blue)
- "Free AI Credits": (Heebo Bold, 64pt, white)
- Benefits list: (Heebo Regular, 36pt)
- CTA button: (Heebo Bold, 42pt)

**Color Palette**:
- "500" gradient: Linear gradient from #FBBF24 (gold) to #3B82F6 (blue)
- Background: Radial gradient (dark blue center to black edges)
- CTA button: #10B981 (green) with hover glow

**Layout**:
```
┌─────────────────────────────────────────┐
│                                          │
│              [Apple TV]                  │
│                                          │
│               500                        │
│           Free AI Credits                │
│                                          │
│  ✅ Real-time dubbing                   │
│  ✅ Smart context cards                 │
│  ✅ AI search                            │
│  ✅ Early access                         │
│                                          │
│        [Join Beta Now Button]            │
│                                          │
│      Limited to first 500 users          │
│              bayit.tv                    │
└─────────────────────────────────────────┘
```

**Notes for Designer**:
- Make "500" number highly prominent and eye-catching
- Use premium materials/textures (metallic gold, glass)
- Apple TV should be photorealistic
- CTA button should have subtle animation (glow/pulse)
- Overall design should feel exclusive and premium

---

## 2. Social Media Graphics

### Twitter/X Post Image

**Dimensions**: 1200 x 675 pixels (16:9)
**Format**: PNG or JPEG
**Quantity**: 5 variations (one per feature)

**Variation 1: Launch Announcement**
- Background: Gradient (Bayit+ blue to purple)
- Apple TV logo + Bayit+ logo
- Text: "NOW AVAILABLE ON APPLE TV"
- Subtext: "The Smart Israeli TV Hub"

**Variation 2: AI Dubbing**
- Background: Screenshot of live TV with dubbing overlay
- Text overlay: "Real-Time AI Dubbing"
- Subtext: "Watch Israeli TV in 10 Languages"

**Variation 3: Context Cards**
- Background: Context card example
- Text: "Never Feel Lost Again"
- Subtext: "Smart Context Cards Explain Everything"

**Variation 4: Visual Sync**
- Background: TV + iPhone sync visual
- Text: "Magic Sync Technology"
- Subtext: "Point. Sync. Listen."

**Variation 5: Beta 500**
- Background: Premium gradient with "500" number
- Text: "Join Beta 500"
- Subtext: "500 Free AI Credits"
- CTA: "bayit.tv/beta"

**Design Requirements**:
- All text must be readable at thumbnail size
- Maintain Bayit+ brand colors (#1E40AF blue, #10B981 green)
- Include Bayit+ logo in corner
- Safe zone: Keep text 60px from edges

---

### Instagram Post (Square)

**Dimensions**: 1080 x 1080 pixels (1:1)
**Format**: PNG
**Quantity**: 5-image carousel

**Slide 1: Teaser**
- Bayit+ logo centered
- Text: "The Future of Israeli Streaming"
- Subtext: "Swipe to see how ➡️"

**Slide 2-5**: Same content as Twitter variations but cropped to square

**Design Requirements**:
- Optimized for mobile viewing
- High contrast for small screens
- Consistent brand styling across all slides

---

### Instagram Stories

**Dimensions**: 1080 x 1920 pixels (9:16)
**Format**: PNG or MP4 (video)
**Quantity**: 5 stories

**Story 1: Announcement**
- Vertical video or animated PNG
- Apple TV device floating/rotating
- Text overlay: "Bayit+ is here"
- Swipe-up CTA: "Download Now"

**Story 2-5**: Feature highlights (vertical format)

**Design Requirements**:
- Keep important content in "safe zone" (avoid top/bottom 250px)
- Use vertical video format when possible
- Include interactive elements (polls, swipe-up)

---

### LinkedIn Post Image

**Dimensions**: 1200 x 627 pixels
**Format**: PNG
**Quantity**: 1 professional announcement graphic

**Composition**:
- Professional, corporate aesthetic
- Apple TV + Bayit+ logos
- Key stats: "10 Languages", "Real-Time AI", "500K+ Hours"
- Clean, minimalist design

---

### Facebook Cover Photo

**Dimensions**: 820 x 312 pixels
**Format**: PNG
**Quantity**: 1

**Composition**:
- Horizontal banner featuring key visuals
- Text: "Bayit+ Now on Apple TV"
- Multiple device mockups (TV, iPhone, iPad)

---

## 3. Email Header Graphics

### Launch Email Header

**Dimensions**: 600 x 300 pixels
**Format**: PNG
**Quantity**: 3 (launch, beta invite, weekly newsletter)

**Composition**:
- Bayit+ logo + "Apple TV" text
- Feature icons (dubbing, context, sync)
- Gradient background

---

## 4. App Icon (if needed)

**Dimensions**:
- 1280 x 768 pixels (Apple TV icon - layered image)
- 1024 x 1024 pixels (iOS/fallback)

**Requirements**:
- No transparency
- Layered design (foreground, middle, background for parallax)
- Recognizable at small sizes
- Follows Apple TV icon guidelines

---

## 5. Press Kit Assets

### High-Resolution Logo Pack

**Formats**: PNG, SVG, EPS
**Variations**:
- Full color on white background
- Full color on dark background
- Monochrome (black)
- Monochrome (white)

**Sizes**:
- 512x512, 1024x1024, 2048x2048, 4096x4096

---

### Founder/Team Photos

**Dimensions**: 2000 x 2000 pixels (square)
**Format**: JPEG, high-quality
**Quantity**: As needed

**Requirements**:
- Professional headshots
- Consistent lighting and background
- High resolution for press use

---

### Product Screenshots for Press

**Dimensions**: 3840 x 2160 pixels (4K)
**Format**: PNG
**Quantity**: 10+ diverse screenshots

**Include**:
- All major features in action
- Different content types (movies, live TV, podcasts)
- UI elements (navigation, settings, player)
- Context cards examples
- Visual sync demonstration

---

## 6. Video Assets

### App Preview Video (App Store)

**Dimensions**: 1920 x 1080 pixels
**Length**: 15-30 seconds
**Format**: H.264 or HEVC, MP4 container
**Frame Rate**: 30fps
**Audio**: Stereo, 48kHz, AAC

**Requirements**:
- Show actual app footage (no mockups)
- Include transitions between features
- Add text overlays for key messages
- Background music (licensed, non-intrusive)
- Closed captions for accessibility

---

### Social Media Video (30s)

**Variations**:
- **Horizontal**: 1920 x 1080 (YouTube, Twitter, LinkedIn)
- **Square**: 1080 x 1080 (Instagram Feed)
- **Vertical**: 1080 x 1920 (Instagram Stories, TikTok)

**Requirements**:
- First 3 seconds must grab attention
- Silent-friendly (text overlays, captions)
- Bayit+ logo/branding in first 2 seconds
- End with clear CTA

---

### Demo Video (60-90s)

**Dimensions**: 1920 x 1080 pixels
**Format**: MP4, H.264
**Purpose**: Website, press kit, presentations

**Content**:
- Problem statement (0-15s)
- Solution overview (15-30s)
- Feature walkthrough (30-75s)
- Call-to-action (75-90s)

---

## 7. Brand Guidelines Summary

### Colors

**Primary Palette**:
- Bayit+ Blue: #1E40AF
- Success Green: #10B981
- Dark Background: #0F172A
- Glass Overlay: rgba(255, 255, 255, 0.1)

**Secondary Palette**:
- Accent Purple: #8B5CF6
- Accent Gold: #FBBF24
- Warning Orange: #F59E0B
- Error Red: #EF4444

**Gradients**:
- Primary: Linear from #1E40AF to #3B82F6
- Premium: Linear from #FBBF24 to #3B82F6
- Dark: Radial from #1E3A8A to #0F172A

### Typography

**Font Family**: Heebo (Google Fonts)
- **Display**: Heebo Black (900)
- **Headings**: Heebo Bold (700)
- **Body**: Heebo Regular (400)
- **Captions**: Heebo Light (300)

**Sizes** (for 1920x1080):
- H1: 84pt
- H2: 64pt
- H3: 48pt
- Body: 32pt
- Caption: 24pt

### Spacing

**Grid**: 8px base unit
**Margins**:
- Outer: 60px
- Inner: 40px
**Padding**: 24px standard

### Effects

**Glassmorphism**:
- Background: rgba(255, 255, 255, 0.1)
- Backdrop blur: 20px
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)

**Shadows**:
- Small: 0 2px 8px rgba(0, 0, 0, 0.2)
- Medium: 0 4px 16px rgba(0, 0, 0, 0.3)
- Large: 0 8px 32px rgba(0, 0, 0, 0.4)

---

## 8. Asset Delivery

### File Naming Convention

```
bayit-tvos-[asset-type]-[variant]-[dimension].[ext]

Examples:
- bayit-tvos-screenshot-hero-1920x1080.png
- bayit-tvos-social-twitter-launch-1200x675.png
- bayit-tvos-icon-full-color-1024x1024.png
- bayit-tvos-video-preview-30s-1920x1080.mp4
```

### Folder Structure

```
/assets/
├── app-store/
│   ├── screenshots/
│   ├── previews/
│   └── icon/
├── social-media/
│   ├── twitter/
│   ├── instagram/
│   ├── facebook/
│   └── linkedin/
├── email/
│   └── headers/
├── press-kit/
│   ├── logos/
│   ├── screenshots/
│   ├── photos/
│   └── videos/
└── brand/
    ├── colors/
    ├── fonts/
    └── templates/
```

### Delivery Format

**Provide**:
- [ ] All source files (PSD, AI, Figma, Sketch)
- [ ] Exported assets in required formats
- [ ] Font files and licenses
- [ ] Stock asset licenses (if applicable)
- [ ] Video project files (Premiere, Final Cut, After Effects)
- [ ] Asset manifest (spreadsheet listing all deliverables)

---

## 9. Timeline

**Phase 1: App Store Assets (Priority 1)** - Due: [Date]
- [ ] 5 screenshots (1920x1080)
- [ ] App icon (1280x768 layered)
- [ ] App preview video (30s)

**Phase 2: Social Media Launch (Priority 2)** - Due: [Date]
- [ ] Twitter graphics (5 variations)
- [ ] Instagram carousel (5 slides)
- [ ] Instagram stories (5 stories)
- [ ] LinkedIn post graphic
- [ ] Facebook cover

**Phase 3: Email & Press (Priority 3)** - Due: [Date]
- [ ] Email headers (3 variations)
- [ ] Press kit screenshots (10+)
- [ ] High-res logos (all variations)
- [ ] Demo video (60-90s)

---

## 10. Designer Contact & Feedback

**Approval Process**:
1. Designer submits draft assets
2. Bayit+ team reviews and provides feedback
3. Designer implements revisions
4. Final approval and delivery

**Feedback Submission**:
- Use Figma comments for design feedback
- Email final assets to: design@bayit.tv
- Include asset manifest spreadsheet

**Questions During Design**:
- Contact: design@bayit.tv
- Slack: #bayit-design-team
- Weekly sync: Wednesdays 2pm PT

---

**Specifications Last Updated**: 2026-02-04
**Version**: 1.0
**Owner**: Bayit+ Design Team
**Contact**: design@bayit.tv
