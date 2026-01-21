# App Store Screenshots Guide

## Overview

This guide provides specifications and guidelines for creating App Store screenshots for BayitPlus across multiple languages and devices.

---

## Screenshot Specifications

### Device Requirements

| Device | Screen Size | Resolution | Format |
|--------|------------|-----------|--------|
| iPhone 6.5" | 1284 x 2778 | 3x (OLED) | PNG/JPG |
| iPhone 5.5" | 1242 x 2208 | 3x | PNG/JPG |
| iPad Pro 12.9" | 2048 x 2732 | 2x | PNG/JPG |
| iPad Pro 11" | 2388 x 1668 | 2x | PNG/JPG |

**Recommended**: Use iPhone 6.5" (iPhone 14 Pro Max) as primary device - covers 90% of users.

### Screenshot Counts

- **Minimum**: 2 screenshots per language
- **Recommended**: 5-10 screenshots per language
- **Maximum**: 10 screenshots per language

### File Requirements

- **Format**: PNG or JPG
- **Quality**: 72 DPI minimum
- **Size**: <5MB per image
- **Naming Convention**: `screenshot_1_en.png`, `screenshot_2_en.png`, etc.

---

## Screenshot Strategy

### BayitPlus Screenshot Narrative (5 screens)

Each screenshot tells a story of the app's capabilities:

1. **Screen 1: Voice Control** - "Hands-Free Content Discovery"
2. **Screen 2: Content Browse** - "Explore Cultural Content"
3. **Screen 3: Personalization** - "Personalized Recommendations"
4. **Screen 4: Multi-Language** - "Available in 3 Languages"
5. **Screen 5: Performance** - "Fast & Responsive"

---

## Screenshot Specifications by Language

### English Screenshots (en-US)

#### Screenshot 1: Voice Control
**Key Message**: "Use Your Voice to Control Everything"

**UI Elements to Display**:
- VoiceSearchModal showing animated listening state
- Pulsing dot animation (red/listening state)
- Transcription text: "Play documentary about ancient cultures"
- Microphone icon prominent

**Text Overlay** (optional):
- Title: "Voice Commands"
- Subtitle: "Play, search, navigate with your voice"
- Font: System font, white on semi-transparent dark background

**Technical Requirements**:
- Show VoiceStatusIndicator in navigation bar
- Highlight microphone animation
- Show transcription being captured in real-time

#### Screenshot 2: Content Discovery
**Key Message**: "Browse Thousands of Cultural Content Items"

**UI Elements to Display**:
- HomeScreenMobile with category list
- Several category cards visible
- Scroll position showing mix of content types
- Nice healthy mix of categories

**Text Overlay**:
- Title: "Explore Categories"
- Subtitle: "Discover content from cultures around the world"

#### Screenshot 3: Recommendations
**Key Message**: "Get Personalized Recommendations"

**UI Elements to Display**:
- Trending section or personalized recommendations
- Multiple content cards
- Ratings/hearts visible on cards
- User has marked some as favorites

**Text Overlay**:
- Title: "Smart Recommendations"
- Subtitle: "Curated based on your interests"

#### Screenshot 4: Multi-Language Support
**Key Message**: "Available in Multiple Languages"

**UI Elements to Display**:
- Settings screen showing language selector
- Language options visible: English, עברית (Hebrew), Español (Spanish)
- Flag or language identifiers visible
- Current language highlighted

**Text Overlay**:
- Title: "Available in Your Language"
- Subtitle: "English, Hebrew, Spanish, and more"

#### Screenshot 5: Performance & Features
**Key Message**: "Fast, Responsive, Packed with Features"

**UI Elements to Display**:
- App showing smooth scrolling/interaction
- Multiple feature badges:
  - ⚡ Fast startup
  - 🎙️ Voice control
  - 🌍 Multi-language
  - ♿ Accessible
  - 📱 Responsive design

**Text Overlay**:
- Title: "Built for Performance"
- Subtitle: "66% faster startup, 100% better experience"

---

### Hebrew Screenshots (he-IL) - RTL Layout

**Important Notes**:
- Screenshots must show RTL (Right-to-Left) layout
- All text should be in Hebrew (עברית)
- UI mirrored: buttons on left, navigation on right
- Everything else mirrors screenshot 1-5 English versions

#### Key Translations for Overlays

- "Voice Commands" → "פקודות קול"
- "Play, search, navigate with your voice" → "השמע, חפש, נווט בעזרת הקול שלך"
- "Explore Categories" → "בדוק קטגוריות"
- "Discover content from cultures around the world" → "גלה תוכן מתרבויות ברחבי העולם"
- "Smart Recommendations" → "המלצות חכמות"
- "Curated based on your interests" → "מעובד בהתאם לעניינים שלך"
- "Available in Your Language" → "זמין בשפה שלך"
- "English, Hebrew, Spanish, and more" → "אנגלית, עברית, ספרדית ועוד"
- "Built for Performance" → "בנוי לביצועים"
- "66% faster startup, 100% better experience" → "הפעלה מהירה 66%, חוויה טובה יותר 100%"

---

### Spanish Screenshots (es-ES)

**Important Notes**:
- Screenshots with LTR (Left-to-Right) layout (normal orientation)
- All text in Spanish
- Spain spelling (Español, not Latino)

#### Key Translations for Overlays

- "Voice Commands" → "Comandos de Voz"
- "Play, search, navigate with your voice" → "Reproduce, busca, navega con tu voz"
- "Explore Categories" → "Explorar Categorías"
- "Discover content from cultures around the world" → "Descubre contenido de culturas alrededor del mundo"
- "Smart Recommendations" → "Recomendaciones Inteligentes"
- "Curated based on your interests" → "Seleccionado basado en tus intereses"
- "Available in Your Language" → "Disponible en Tu Idioma"
- "English, Hebrew, Spanish, and more" → "Inglés, Hebreo, Español y más"
- "Built for Performance" → "Construido para Rendimiento"
- "66% faster startup, 100% better experience" → "66% inicio más rápido, 100% mejor experiencia"

---

## Creating Screenshots

### Method 1: Using iOS Simulator (Fastest)

```bash
# 1. Start app on iPhone 6.5" simulator
cd mobile-app
npm start

# In another terminal:
npx react-native run-ios --simulator "iPhone 14 Pro Max"

# 2. Navigate to each screen in sequence

# 3. Take screenshot (in Simulator)
#    Cmd+S → Save to Desktop

# 4. Organize screenshots
mkdir -p screenshots/{en,he,es}
mv ~/Desktop/Screenshot*.png screenshots/en/
```

### Method 2: Using Xcode (Recommended for Pixel-Perfect)

```bash
# 1. Open Xcode
open ios/BayitPlus.xcworkspace

# 2. Select iPhone 14 Pro Max simulator
# 3. Run app (Product → Run or Cmd+R)
# 4. Navigate to each screen
# 5. Debug → View Hierarchy → Screenshot
# Or: Cmd+Shift+S in simulator
```

### Method 3: Using Tools (Automated)

```bash
# Install screenshot tool
npm install -g screenshots

# Configure screenshots.json
cat > screenshots.json << 'EOF'
{
  "app": "BayitPlus",
  "ios": {
    "scheme": "BayitPlus",
    "device": "iPhone 14 Pro Max",
    "language": "en-US"
  },
  "screenshots": [
    {
      "screen": "Voice",
      "title": "Voice Commands",
      "message": "Play, search, navigate with your voice"
    },
    {
      "screen": "Home",
      "title": "Explore Categories",
      "message": "Discover content from cultures around the world"
    }
  ]
}
EOF

# Generate screenshots
screenshots --path screenshots.json
```

---

## Adding Text Overlays

### Design Specifications

**Title Text**:
- Font: System Bold
- Size: 44pt
- Color: White (#FFFFFF)
- Position: Center, vertically centered
- Shadow: Dark shadow for contrast

**Subtitle Text**:
- Font: System Regular
- Size: 20pt
- Color: Light Gray (#E2E8F0)
- Position: Below title, centered
- Shadow: Dark shadow for contrast

**Background**:
- Semi-transparent dark overlay (black 80% opacity)
- Height: 200-300pt
- Rounded corners: 20pt radius

### Using Design Tools

#### Option A: Figma (Recommended)

1. Create new Figma file: BayitPlus Screenshots
2. Create component: Screenshot (1284 x 2778px)
3. Add text components for overlays
4. Duplicate for each language
5. Export as PNG

**Figma Template**:
```
Frame: "Screenshot Base" (1284x2778)
├─ Image: Background (screenshot from app)
├─ Rectangle: Overlay (black, 80% opacity)
├─ Text: Title (44pt, white, centered)
└─ Text: Subtitle (20pt, light gray, centered)
```

#### Option B: Sketch

1. Create artboard: iPhone 6.5" (1284x2778)
2. Add screenshot image
3. Add dark overlay shape
4. Add text layers
5. Export for App Store

#### Option C: Preview (macOS)

```bash
# Using Preview.app to add text
# 1. Open screenshot in Preview
# 2. Tools → Annotate → Text
# 3. Add title and subtitle
# 4. Adjust position and size
# 5. Export as PNG
```

### Using Command-Line Tools

```bash
# Using ImageMagick to add text overlays
convert screenshot_1.png \
  -background "rgba(0,0,0,0.8)" \
  -bordercolor transparent -border 0 \
  -gravity center \
  -pointsize 80 \
  -font Arial-Bold \
  -fill white \
  -annotate +0-200 "Voice Commands" \
  -pointsize 36 \
  -font Arial \
  -fill gray \
  -annotate +0+100 "Play, search, navigate with your voice" \
  screenshot_1_overlay.png

# Using GraphicsMagick (faster)
gm convert screenshot_1.png \
  -fill "rgba(0,0,0,0.8)" -draw "rectangle 0,1500 1284,2778" \
  -fill white -font Arial-Bold -pointsize 80 \
  -draw "text 642,2000 'Voice Commands'" \
  screenshot_1_final.png
```

---

## App Store Connect Upload

### Preparation Checklist

```bash
# ✓ All 5 screenshots created for each language
# ✓ Screenshots exported as PNG, <5MB each
# ✓ Naming convention: screenshot_1_en.png, etc.
# ✓ Reviewed for quality and clarity
# ✓ Text overlays readable and well-positioned
# ✓ App screenshots match current version
```

### Upload Process

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com
   - Select your app "BayitPlus"
   - Go to Version Information

2. **Add Screenshots**
   - Select language: English
   - Screen size: iPhone 6.5"
   - Drag and drop screenshots in order
   - Add subtitle for each (optional)

3. **Repeat for Other Languages**
   - Select language: Hebrew
   - Upload Hebrew screenshots
   - Select language: Spanish
   - Upload Spanish screenshots

4. **Review and Submit**
   - Preview how screenshots appear
   - Verify text is readable
   - Save and continue

---

## A/B Testing Screenshots

### Best Practices

- **Screenshot 1**: Should immediately capture attention
- **Show Benefits**: Each screenshot highlights a key feature
- **Use Consistent Branding**: Colors, fonts, style consistent
- **Include Real App UI**: Use actual screenshots, not mockups
- **Feature Variety**: Show different aspects of app
- **Test Different Messages**: Track conversion metrics

### Conversion Optimization

Monitor App Store analytics:
- Screenshot impression data
- Conversion rate by screenshot
- Which screenshots drive installs
- Which text messages resonate

Based on data:
- Swap underperforming screenshots
- Improve copy/messaging
- A/B test different versions
- Iterate monthly

---

## Common Screenshot Issues

| Issue | Solution |
|-------|----------|
| Text too small | Increase font size to 44pt minimum |
| Poor contrast | Ensure 4.5:1 contrast ratio |
| Cut off at edges | Add 50px padding on all sides |
| Orientation wrong | Verify device orientation (portrait only) |
| Text unreadable | Add dark background overlay behind text |
| Outdated UI | Update after each major version |
| Missing branding | Add app logo and colors |
| Low quality | Take on actual device or high-res simulator |

---

## File Organization

```
screenshots/
├── en/
│   ├── screenshot_1_en.png          # Voice Commands
│   ├── screenshot_2_en.png          # Explore Categories
│   ├── screenshot_3_en.png          # Smart Recommendations
│   ├── screenshot_4_en.png          # Multi-Language
│   └── screenshot_5_en.png          # Performance
├── he/
│   ├── screenshot_1_he.png
│   ├── screenshot_2_he.png
│   ├── screenshot_3_he.png
│   ├── screenshot_4_he.png
│   └── screenshot_5_he.png
├── es/
│   ├── screenshot_1_es.png
│   ├── screenshot_2_es.png
│   ├── screenshot_3_es.png
│   ├── screenshot_4_es.png
│   └── screenshot_5_es.png
├── originals/                       # Originals without overlays
│   ├── screenshot_1_original.png
│   ├── screenshot_2_original.png
│   ├── screenshot_3_original.png
│   ├── screenshot_4_original.png
│   └── screenshot_5_original.png
└── templates/                       # Design templates
    ├── screenshot_template.figma
    └── text_overlay_template.sketch
```

---

## Key Metrics

After uploading to App Store, monitor:

| Metric | Target | Tool |
|--------|--------|------|
| Impressions | >10,000/month | App Store Connect |
| Conversion Rate | >30% | App Store Connect |
| Completion Rate | >50% | App Store Connect |
| User Reviews | 4.5+ stars | App Store |
| Install Growth | +20% MoM | Analytics |

---

## Update Schedule

- **Major Version**: Update all screenshots
- **Minor Version**: Update if UI significantly changes
- **Patch Version**: No screenshot update needed
- **Seasonal**: Update messaging quarterly
- **A/B Testing**: Rotate screenshots monthly for optimization

---

## Resources

- **Screenshot Tools**:
  - Figma (design): https://figma.com
  - Sketch (design): https://sketch.com
  - Screenshots.io (automated): https://screenshots.io

- **App Store Guidelines**:
  - https://developer.apple.com/app-store/screenshots/
  - https://developer.apple.com/design/human-interface-guidelines/

- **Example Screenshots**:
  - Check competitor apps in App Store
  - Review successful apps in your category
  - Study high-download apps

---

**Last Updated**: January 20, 2026
**Next Review**: When major UI changes occur
