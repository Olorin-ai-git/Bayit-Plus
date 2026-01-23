# Olorin-Sentinel Asset Specifications

This document outlines all required visual assets for the Olorin-Sentinel rebrand.

## Design Theme

**Visual Identity**: Cyber-Guardian
**Primary Colors**:
- Deep Void Purple: `#11051B`
- Electric Cyan: `#00F0FF`
- Threat Red: `#FF003C`

**Typography**:
- Display/Headers: Orbitron (Bold, Uppercase)
- Body: Inter (Regular)

---

## 1. Logo Assets

### 1.1 Main Logo (fraud.png)
**Location**: `/packages/portal-fraud/public/logos/wizard/fraud.png`

**Specifications**:
- Dimensions: 400x120px (landscape orientation)
- Format: PNG with transparency
- File size: <200KB
- DPI: 72

**Design Elements**:
- Text: "OLORIN-SENTINEL" in Orbitron Bold
- Icon: Shield with electric cyan glow
- Color scheme: Electric cyan (`#00F0FF`) on transparent background
- Optional tagline: "The All-Seeing Shield" in smaller Inter font below

**Usage**:
- Website header/navigation
- Hero sections
- Footer

---

### 1.2 Sentinel Logo Variants

#### Full Logo with Text
**Location**: `/packages/portal-fraud/public/logos/sentinel/sentinel-logo.png`

**Specifications**:
- Dimensions: 500x150px
- Format: PNG with transparency
- Text: "OLORIN-SENTINEL" + shield icon
- Color: Electric cyan with subtle glow effect

#### Icon Only (Square)
**Location**: `/packages/portal-fraud/public/logos/sentinel/sentinel-icon.png`

**Specifications**:
- Dimensions: 512x512px (square)
- Format: PNG with transparency
- Icon: Shield symbol only
- Use case: App icons, social media avatars

#### Shield Graphic (SVG)
**Location**: `/packages/portal-fraud/public/logos/sentinel/sentinel-shield.svg`

**Specifications**:
- Format: SVG (scalable vector)
- File size: <50KB
- Design: Shield outline with cyber-grid pattern inside
- Colors: Electric cyan strokes (`#00F0FF`)
- Style: Geometric, angular (not rounded)

---

## 2. Favicon Assets

All favicons should feature the **Sentinel shield icon** in electric cyan on a deep void purple background.

### Required Sizes

| Filename | Size | Usage |
|----------|------|-------|
| `16x16.png` | 16x16px | Browser tab (small) |
| `32x32.png` | 32x32px | Browser tab (standard) |
| `64x64.png` | 64x64px | Browser bookmark bar |
| `128x128.png` | 128x128px | Chrome Web Store |
| `192x192.png` | 192x192px | Android home screen |
| `512x512.png` | 512x512px | Android splash screen |
| `apple-touch-icon.png` | 180x180px | iOS home screen |
| `favicon.ico` | Multi-size ICO | IE/Legacy browsers |

**Location**: `/packages/portal-fraud/public/favicons/`

**Design Specifications**:
- Background: Deep void purple (`#11051B`)
- Icon: Shield symbol in electric cyan (`#00F0FF`)
- Padding: 15% on all sides
- Style: Simplified shield for small sizes (remove complex details)
- Glow: Subtle cyan glow at larger sizes (192px+)

**Color Requirements**:
- Must be visible on browser tab backgrounds (light and dark)
- High contrast between background and icon
- No gradients on sizes <32px (clarity)

---

## 3. Hero Section Assets

### 3.1 Shield Icon (Hero)
**Location**: `/packages/portal-fraud/public/assets/sentinel/shield-icon.png`

**Specifications**:
- Dimensions: 800x800px
- Format: PNG with transparency
- File size: <300KB
- DPI: 144 (2x for retina displays)

**Design**:
- Large shield with cyber-grid pattern overlay
- Electric cyan glowing edges
- Semi-transparent center (60% opacity)
- Use with `sentinel-breathe` animation class

**Usage**:
- Center of hero section
- Particle effect target
- Featured on homepage above fold

---

### 3.2 Wizard Sprites

#### Conjuring Wizard
**Location**: `/packages/portal-fraud/public/assets/sentinel/wizard-conjuring.png`

**Specifications**:
- Dimensions: 400x600px
- Format: PNG with transparency
- Wizard figure casting protection spell
- Electric cyan magic effects
- Dark robes with cyan accents

**Usage**: Agent collaboration sections

#### Thinking Wizard
**Location**: `/packages/portal-fraud/public/assets/sentinel/wizard-thinking.png`

**Specifications**:
- Dimensions: 400x600px
- Format: PNG with transparency
- Wizard figure in analytical pose
- Subtle cyan glow around head (intelligence)
- Dark robes

**Usage**: Features/capabilities sections

---

### 3.3 Success Metrics Graph
**Location**: `/packages/portal-fraud/public/assets/sentinel/graph-chart.png`

**Specifications**:
- Dimensions: 1200x600px
- Format: PNG with transparency
- Style: Line graph showing upward trend
- Colors:
  - Background: Transparent
  - Grid lines: Cyan 20% opacity
  - Data line: Electric cyan
  - Trend area fill: Cyan gradient (80% → 0% opacity)
- Labels: Orbitron font for numbers

**Data Points** (suggested):
- Month 1: 20% fraud reduction
- Month 2: 45%
- Month 3: 65%
- Month 4: 80%

**Usage**: Success story section

---

## 4. Social Media Assets

### 4.1 Open Graph Image
**Location**: `/packages/portal-fraud/public/sentinel-og-image.png`

**Specifications**:
- Dimensions: 1200x630px (Facebook/LinkedIn standard)
- Format: PNG or JPG
- File size: <500KB
- DPI: 72

**Design Layout**:
```
┌─────────────────────────────────────────────────┐
│  Deep Void Purple Background (#11051B)         │
│                                                 │
│  [Shield Icon]  OLORIN-SENTINEL                │
│                                                 │
│  FRAUD EVOLVES. SO DO OUR AGENTS.              │
│                                                 │
│  4 Domain Agents | Real-Time Protection        │
│                                                 │
│  Deploy Sentinel →                             │
└─────────────────────────────────────────────────┘
```

**Typography**:
- Headline: Orbitron Bold, 72pt, Electric Cyan
- Subtext: Inter Regular, 36pt, White 80% opacity
- CTA: Orbitron Bold, 48pt, Electric Cyan

**Usage**:
- Facebook link previews
- LinkedIn shares
- Twitter cards
- Slack/Discord embeds

---

### 4.2 Twitter Card Image
**Location**: `/packages/portal-fraud/public/sentinel-twitter-card.png`

**Specifications**:
- Dimensions: 1200x600px (Twitter summary large image)
- Format: PNG or JPG
- File size: <1MB
- Similar design to Open Graph image

---

## 5. Asset Optimization

### Tools Required
- **TinyPNG** (https://tinypng.com/) - PNG compression
- **SVGO** (https://jakearchibald.github.io/svgomg/) - SVG minification
- **ImageOptim** (Mac) or **FileOptimizer** (Windows) - Batch optimization

### Optimization Targets
- PNG files: Compress to <80% of original size
- SVG files: Remove unnecessary metadata, decimal precision to 2
- Total asset bundle: <2MB for all images combined

### Image Quality Guidelines
- Logos: Lossless compression only
- Icons/Favicons: Lossless compression
- Hero assets: Lossy acceptable if quality >90%
- Social media images: Lossy acceptable if quality >85%

---

## 6. Asset Checklist

### Logos
- [ ] Main logo (fraud.png) - 400x120px
- [ ] Sentinel logo with text (sentinel-logo.png) - 500x150px
- [ ] Icon only (sentinel-icon.png) - 512x512px
- [ ] Shield SVG (sentinel-shield.svg) - Scalable

### Favicons
- [ ] 16x16.png
- [ ] 32x32.png
- [ ] 64x64.png
- [ ] 128x128.png
- [ ] 192x192.png
- [ ] 512x512.png
- [ ] apple-touch-icon.png (180x180px)
- [ ] favicon.ico (multi-size)

### Hero Assets
- [ ] Shield icon hero (shield-icon.png) - 800x800px
- [ ] Wizard conjuring sprite - 400x600px
- [ ] Wizard thinking sprite - 400x600px
- [ ] Success graph chart - 1200x600px

### Social Media
- [ ] Open Graph image - 1200x630px
- [ ] Twitter card image - 1200x600px

### Optimization
- [ ] All PNG files compressed with TinyPNG
- [ ] All SVG files minified with SVGO
- [ ] Total bundle size verified <2MB

---

## 7. Design Notes

### Shield Design Guidelines
The Sentinel shield should convey:
- **Protection**: Defensive barrier against threats
- **Technology**: Cyber/digital aesthetic (not medieval)
- **Intelligence**: Geometric precision, calculated design
- **Vigilance**: Angular/sharp edges, alert posture

**Avoid**:
- Rounded/soft edges (too friendly)
- Medieval/fantasy shield designs (wrong theme)
- Complex textures that don't scale well
- Colors outside the Sentinel palette

### Color Accessibility
All assets must maintain WCAG AA contrast ratios:
- Electric cyan (`#00F0FF`) on deep void purple (`#11051B`): ✅ 8.2:1 ratio
- White text on deep void purple: ✅ 15.1:1 ratio
- Threat red (`#FF003C`) on deep void purple: ✅ 4.7:1 ratio

---

## 8. Placeholder Assets (Temporary)

Until final assets are created, use these placeholders:

```tsx
// Temporary placeholder for shield icon
<div className="w-32 h-32 bg-wizard-accent-sentinel-cyan/10 border-4 border-wizard-accent-sentinel-cyan rounded-lg flex items-center justify-center">
  <span className="text-6xl">🛡️</span>
</div>

// Temporary placeholder for logo
<div className="sentinel-heading-md text-wizard-accent-sentinel-cyan">
  OLORIN-SENTINEL
</div>
```

---

## 9. Asset Delivery Format

Please provide assets in the following structure:

```
assets-delivery/
├── logos/
│   ├── sentinel-logo.png
│   ├── sentinel-icon.png
│   └── sentinel-shield.svg
├── favicons/
│   ├── 16x16.png
│   ├── 32x32.png
│   ├── 64x64.png
│   ├── 128x128.png
│   ├── 192x192.png
│   ├── 512x512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
├── hero/
│   ├── shield-icon.png
│   ├── wizard-conjuring.png
│   ├── wizard-thinking.png
│   └── graph-chart.png
└── social/
    ├── sentinel-og-image.png
    └── sentinel-twitter-card.png
```

---

## Contact

For questions about asset specifications or design guidelines, contact the design team.

**Last Updated**: 2026-01-22
