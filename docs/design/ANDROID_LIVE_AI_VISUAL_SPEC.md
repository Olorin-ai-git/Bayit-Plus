# Android Live AI Features - Visual Design Specification

**Version:** 1.0
**Platform:** Android (Material Design 3 + Bayit+ Glass Design System)
**Date:** February 16, 2026

---

## Design Principles

1. **Glassmorphic Dark Mode:** All overlays use translucent glass effects with purple accent borders
2. **Non-Intrusive:** Overlays fade in/out smoothly, auto-dismiss after appropriate durations
3. **Contextual Positioning:** Each overlay positioned to avoid obscuring video content
4. **Accessibility First:** Minimum 48dp touch targets, WCAG AA contrast, screen reader support

---

## Component 1: Live Subtitle Overlay

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│                  VIDEO CONTENT                  │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│          ┌─────────────────────────┐            │
│          │  Previous subtitle text │            │ ← 12sp, 50% opacity
│          │  Current subtitle text  │            │ ← 16sp, 100% opacity, bold
│          └─────────────────────────┘            │
│                     ↑                           │
│                40dp padding                     │
└─────────────────────────────────────────────────┘
                     Bottom
```

### Layout Properties

| Property | Value | Token |
|----------|-------|-------|
| **Position** | Bottom-center | `Alignment.BottomCenter` |
| **Max Width** | 90% of screen | `fillMaxWidth().padding(horizontal = xl)` |
| **Bottom Padding** | 40dp | `DesignTokens.Spacing.xxxl` |
| **Corner Radius** | 12dp | `DesignTokens.Radius.md` |
| **Background** | Black 85% opacity | `DesignTokens.Colors.Glass.bgStrong` |
| **Border** | Purple 25% opacity | `DesignTokens.Colors.Glass.border` |
| **Border Width** | 2dp | `DesignTokens.Spacing.xxs` |
| **Internal Padding** | 12dp | `DesignTokens.Spacing.md` |

### Typography

| Element | Font Size | Weight | Color | Opacity |
|---------|-----------|--------|-------|---------|
| **Previous subtitle** | 12sp | Regular | White | 50% |
| **Current subtitle** | 16sp | Medium | White | 100% |

### Animation

- **Enter:** `fadeIn()` (default 150ms)
- **Exit:** `fadeOut()` (default 150ms)
- **Auto-dismiss:** 5 seconds after last update

### Accessibility

```kotlin
.accessibilityElement(children = .combine)
.accessibilityLabel("Subtitle: $translatedText. Original: $originalText")
```

---

## Component 2: Live Dubbing Overlay

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│                  VIDEO CONTENT                  │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│          ┌─────────────────────────┐            │
│          │  Original language text │            │ ← 12sp, 50% opacity
│          │       [4dp spacer]      │            │
│          │  Translated text        │            │ ← 16sp, 100% opacity, bold
│          └─────────────────────────┘            │
│                     ↑                           │
│                40dp padding                     │
└─────────────────────────────────────────────────┘
                     Bottom
```

### Layout Properties

| Property | Value | Token |
|----------|-------|-------|
| **Position** | Bottom-center | `Alignment.BottomCenter` |
| **Max Width** | 90% of screen | `fillMaxWidth().padding(horizontal = xl)` |
| **Bottom Padding** | 40dp | `DesignTokens.Spacing.xxxl` |
| **Corner Radius** | 12dp | `DesignTokens.Radius.md` |
| **Background** | Black 85% opacity | `DesignTokens.Colors.Glass.bgStrong` |
| **Border** | Purple 25% opacity | `DesignTokens.Colors.Glass.border` |
| **Internal Padding** | 12dp | `DesignTokens.Spacing.md` |
| **Text Spacing** | 4dp | `DesignTokens.Spacing.xs` |

### Typography

| Element | Font Size | Weight | Color | Opacity |
|---------|-----------|--------|-------|---------|
| **Original text** | 12sp | Regular | White | 50% |
| **Translated text** | 16sp | Medium | White | 100% |

### Animation

- **Enter:** `fadeIn()` (default 150ms)
- **Exit:** `fadeOut()` (default 150ms)
- **Auto-dismiss:** 4 seconds after audio segment ends

---

## Component 3: Trivia Fact Banner

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│  16dp                                           │
│      ┌───────────────────────┐   16dp          │
│      │ ═══════════════════   │ ← Progress bar  │
│      │ ─────────────────     │   (3dp height)  │
│      │                       │                 │
│      │ ✨ AI Trivia    [×]   │ ← Header        │
│      │                       │                 │
│      │ This is the trivia    │ ← Body text     │
│      │ fact content shown    │   (10sp)        │
│      │ to the user.          │                 │
│      │                       │                 │
│      │ Related Person   More │ ← Footer        │
│      └───────────────────────┘                 │
│                  320dp max width                │
│                                                 │
│                  VIDEO CONTENT                  │
└─────────────────────────────────────────────────┘
      Top-Right Position
```

### Layout Properties

| Property | Value | Token |
|----------|-------|-------|
| **Position** | Top-right | `Alignment.TopEnd` |
| **Max Width** | 320dp | `widthIn(max = 320.dp)` |
| **Top Padding** | 16dp | `DesignTokens.Spacing.base` |
| **Right Padding** | 16dp | `DesignTokens.Spacing.base` |
| **Corner Radius** | 16dp | `DesignTokens.Radius.lg` |
| **Background** | Surface 95% opacity | `MaterialTheme.colorScheme.surface` |
| **Internal Padding** | 16dp | `DesignTokens.Spacing.base` |
| **Progress Height** | 3dp | Fixed |

### Typography

| Element | Font Size | Weight | Color | Notes |
|---------|-----------|--------|-------|-------|
| **"AI Trivia" label** | 12sp | Bold | On-surface | MaterialTheme |
| **Category badge** | 10sp | Regular | On-surface | With category icon |
| **Fact text** | 10sp | Regular | On-surface | 3 line limit |
| **Related person** | 10sp | Medium | On-surface 70% | Italic |
| **"More" button** | 10sp | SemiBold | Primary | TextButton |

### Category Icons & Colors

| Category | Icon | Color (Hex) | Material Icon |
|----------|------|-------------|---------------|
| Cast/Actor | Person | #2196F3 (Blue) | `Icons.Default.Person` |
| Production | Movie | #9C27B0 (Purple) | `Icons.Default.Movie` |
| Historical | Schedule | #FF9800 (Orange) | `Icons.Default.Schedule` |
| Cultural | Public | #4CAF50 (Green) | `Icons.Default.Public` |
| Fun/Trivia | Lightbulb | #FFC107 (Amber) | `Icons.Default.Lightbulb` |
| Default | Info | #9C27B0 (Purple) | `Icons.Default.Info` |

### Animation

- **Enter:** `slideInHorizontally(initialOffsetX = { it })` (slides from right)
- **Exit:** `slideOutHorizontally(targetOffsetX = { it })` (slides to right)
- **Progress bar:** Linear animation over `displayDuration` (default 8s)
- **Auto-dismiss:** After progress bar completes

### Accessibility

```kotlin
.accessibilityElement(children = .combine)
.accessibilityLabel("AI Trivia. $category. $factText. Related to $relatedPerson.")
```

---

## Component 4: AI Features Panel (Collapsed)

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│                  VIDEO CONTENT                  │
│                                                 │
│          [Player Controls Here]                 │
│                                                 │
│     ┌───────────────────────┐                   │
│     │ 🇺🇸  ✨              │  48dp height       │
│     └───────────────────────┘                   │
│              ↑                                  │
│         Bottom-center                           │
└─────────────────────────────────────────────────┘
```

### Layout Properties (Collapsed)

| Property | Value | Token |
|----------|-------|-------|
| **Position** | Bottom-center | `Alignment.BottomCenter` |
| **Height** | 48dp (phone), 56dp (tablet) | Fixed |
| **Width** | Intrinsic (~120dp) | `wrapContent()` |
| **Corner Radius** | 16dp | `DesignTokens.Radius.lg` |
| **Background** | Surface 90% opacity | `MaterialTheme.colorScheme.surface` |
| **Border** | Primary 40% opacity | 1px |
| **Horizontal Padding** | 16dp | `DesignTokens.Spacing.base` |

### Elements (Collapsed)

| Element | Size | Spacing | Notes |
|---------|------|---------|-------|
| **Language flag** | 28dp circle | 8dp right margin | Tappable button |
| **Sparkles icon** | 20dp icon in 36dp button | 0dp margin | Toggle expansion |

---

## Component 5: AI Features Panel (Expanded)

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│                  VIDEO CONTENT                  │
│                                                 │
│          [Player Controls Here]                 │
│                                                 │
│     ┌──────────────────────────────────────┐    │
│     │ 🇺🇸 ✨ ▼│ CC  EQ  💡              │    │ ← Feature toggles
│     │  Flag  AI │Subs Dub Trivia          │    │   (36dp buttons)
│     └──────────────────────────────────────┘    │
│              ↑                                  │
│         Bottom-center                           │
└─────────────────────────────────────────────────┘
```

### Layout Properties (Expanded)

| Property | Value | Token |
|----------|-------|-------|
| **Position** | Bottom-center | `Alignment.BottomCenter` |
| **Height** | 48dp (phone), 56dp (tablet) | Fixed |
| **Width** | Intrinsic (~400dp) | `wrapContent()` |
| **Corner Radius** | 16dp (top), 16dp (top) | `DesignTokens.Radius.lg` |
| **Background** | Surface 90% opacity | `MaterialTheme.colorScheme.surface` |
| **Border** | Primary 40% opacity | 1px |
| **Horizontal Padding** | 16dp | `DesignTokens.Spacing.base` |

### Elements (Expanded)

| Element | Size | Spacing | State Colors |
|---------|------|---------|--------------|
| **Language flag** | 28dp circle | 8dp right | Primary container |
| **Sparkles toggle** | 20dp icon in 36dp button | 8dp right | Primary (expanded) |
| **Chevron** | 10dp icon in 24dp button | 0dp right | Secondary text |
| **Divider** | 1px × 32dp | 8dp margin | Border color |
| **Feature buttons** | 20dp icon in 36dp button | 8dp spacing | Tertiary (connecting), Primary (enabled), Muted (disabled) |

### Feature Button Icons

| Feature | Icon | Material Symbol |
|---------|------|-----------------|
| Live Translate | CC | `Icons.Default.ClosedCaption` |
| Dubbing | Waveform | `Icons.Default.GraphicEq` |
| Trivia | Lightbulb | `Icons.Default.Lightbulb` |

### Animation

- **Expansion:** `expandHorizontally()` + `spring(duration = 0.3)`
- **Collapse:** `shrinkHorizontally()` + `spring(duration = 0.3)`

---

## Component 6: Language Picker (Modal Bottom Sheet)

### Visual Specification

```
┌─────────────────────────────────────────────────┐
│          Select Language                        │ ← Title (24sp bold)
│                                                 │
│     ┌─────────────────────────────────┐         │
│     │ 🇺🇸  English              ✓    │         │ ← Selected
│     └─────────────────────────────────┘         │
│     ┌─────────────────────────────────┐         │
│     │ 🇪🇸  Spanish                   │         │
│     └─────────────────────────────────┘         │
│     ┌─────────────────────────────────┐         │
│     │ 🇮🇱  Hebrew                    │         │
│     └─────────────────────────────────┘         │
│     ┌─────────────────────────────────┐         │
│     │ 🇫🇷  French                    │         │
│     └─────────────────────────────────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Layout Properties

| Property | Value | Token |
|----------|-------|-------|
| **Sheet Type** | `ModalBottomSheet` | Material 3 |
| **Title Padding** | 24dp horizontal, 8dp vertical | Fixed |
| **Item Height** | 56dp (minimum touch target) | Fixed |
| **Item Padding** | 24dp horizontal, 16dp vertical | Fixed |
| **Flag Size** | 24sp emoji | System font |
| **Flag Spacing** | 16dp right margin | Fixed |

### Typography

| Element | Font Size | Weight | Color |
|---------|-----------|--------|-------|
| **Sheet title** | 20sp | Bold | On-surface |
| **Language name** | 16sp | Normal (selected: Bold) | On-surface |
| **Checkmark** | 20dp icon | N/A | Primary |

### Accessibility

- Each item has 56dp minimum touch target
- Selected state announced to screen readers
- Sheet dismissible via drag or scrim tap

---

## Color Palette Reference

### Glass Colors

```kotlin
object Glass {
    val bg = Color.Black.copy(alpha = 0.7f)              // 70% black
    val bgLight = Color.Black.copy(alpha = 0.5f)         // 50% black
    val bgMedium = Color.Black.copy(alpha = 0.6f)        // 60% black
    val bgStrong = Color.Black.copy(alpha = 0.85f)       // 85% black
    val border = Color(0xFF7E22CE).copy(alpha = 0.25f)   // Purple 25%
    val borderLight = Color(0xFF7E22CE).copy(alpha = 0.15f) // Purple 15%
    val purpleLight = Color(0xFF581C87).copy(alpha = 0.35f) // Purple 35%
    val purpleStrong = Color(0xFF581C87).copy(alpha = 0.55f) // Purple 55%
    val purpleGlow = Color(0xFF7E22CE).copy(alpha = 0.35f)  // Purple glow
}
```

### Primary Colors

```kotlin
object Primary {
    val base = Color(0xFF7E22CE)      // Purple 700
    val light = Color(0xFFA855F7)     // Purple 500
    val dark = Color(0xFF581C87)      // Purple 900
    val p400 = Color(0xFFC084FC)      // Purple 400 (AI features)
    val p800 = Color(0xFF6B21A8)      // Purple 800 (language badge)
}
```

### Text Colors

```kotlin
object Text {
    val primary = Color.White                      // 100% white
    val secondary = Color.White.copy(alpha = 0.7f) // 70% white
    val muted = Color.White.copy(alpha = 0.5f)     // 50% white
    val disabled = Color.White.copy(alpha = 0.3f)  // 30% white
}
```

### Semantic Colors

```kotlin
object Semantic {
    val success = Color(0xFF10B981)    // Green
    val warning = Color(0xFFF59E0B)    // Amber
    val error = Color(0xFFEF4444)      // Red
    val info = Color(0xFF3B82F6)       // Blue
}
```

---

## Spacing System

```kotlin
object Spacing {
    val xxs: Dp = 2.dp    // Border widths
    val xs: Dp = 4.dp     // Tight spacing
    val sm: Dp = 8.dp     // Button spacing
    val md: Dp = 12.dp    // Card padding
    val base: Dp = 16.dp  // Standard padding
    val lg: Dp = 20.dp    // Section spacing
    val xl: Dp = 24.dp    // Large padding
    val xxl: Dp = 32.dp   // Extra large
    val xxxl: Dp = 40.dp  // Bottom overlay clearance
    val xxxxl: Dp = 48.dp // Maximum spacing
}
```

---

## Touch Target Guidelines

### Material Design Minimum Touch Targets

| Element Type | Minimum Size | Recommended |
|--------------|--------------|-------------|
| **Icon button** | 48dp × 48dp | 48dp × 48dp |
| **Text button** | 48dp height | Variable width |
| **Toggle button** | 48dp × 48dp | 48dp × 48dp |
| **List item** | 48dp height | 56dp height |
| **FAB** | 56dp × 56dp | 56dp × 56dp |

### Current Issues (Needs Fixing)

| Component | Current Size | Should Be | Fix |
|-----------|--------------|-----------|-----|
| AI Panel toggle | 36dp × 36dp | 48dp × 48dp | Add 6dp padding |
| Feature buttons | 36dp × 36dp | 48dp × 48dp | Add 6dp padding |
| Language flag | 28dp circle | 48dp × 48dp | Add 10dp padding |
| Trivia dismiss | 24dp × 24dp | 48dp × 48dp | Add 12dp padding |

### Implementation Pattern

```kotlin
// Visual size: 36dp, Touch target: 48dp
IconButton(
    onClick = { /* action */ },
    modifier = Modifier
        .size(48.dp)           // Touch target
        .padding(6.dp)         // Visual padding
) {
    Icon(
        imageVector = icon,
        contentDescription = "Description",
        modifier = Modifier.size(20.dp) // Icon size
    )
}
```

---

## Animation Specifications

### Transition Durations

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| **Fade in/out** | 150ms | Linear |
| **Slide in/out** | 300ms | Standard |
| **Expand/Collapse** | 300ms | Spring (bounce: 0.3) |
| **Progress bar** | Variable (4-8s) | Linear |

### Spring Animation Parameters

```kotlin
spring(
    dampingRatio = Spring.DampingRatioMediumBouncy, // 0.5
    stiffness = Spring.StiffnessMedium              // 1500
)
```

---

## Z-Index & Layer Ordering

From back to front:

1. **Video surface** (z = 0)
2. **Player controls** (z = 1)
3. **Subtitle/Dubbing overlays** (z = 2)
4. **Trivia banner** (z = 3)
5. **AI Features Panel** (z = 4)
6. **Modal bottom sheets** (z = 5)
7. **Toast/Snackbar** (z = 6)

---

## Responsive Breakpoints

### Phone (< 600dp width)

- AI Panel height: 48dp
- Trivia max width: 320dp
- Bottom padding: 40dp
- Icon button size: 36dp (touch target: 48dp)

### Tablet (600dp - 840dp)

- AI Panel height: 56dp
- Trivia max width: 400dp
- Bottom padding: 56dp
- Icon button size: 40dp (touch target: 56dp)

### Large Tablet/Foldable (> 840dp)

- AI Panel height: 64dp
- Trivia max width: 480dp
- Bottom padding: 72dp
- Icon button size: 44dp (touch target: 64dp)

---

## Dark Mode Compliance

All components are designed for dark mode by default:

- Background: Dark glass with blur effect
- Text: White with varying opacity
- Borders: Purple accent with 15-35% opacity
- Icons: White or primary purple

**Note:** Light mode is not supported for video player overlays (video content requires dark UI for readability).

---

## Accessibility Annotations

### Content Descriptions

```kotlin
// AI Panel toggle
contentDescription = "AI features. ${if (isExpanded) "Collapse" else "Expand"}"

// Feature toggle buttons
contentDescription = when {
    isConnecting -> "$featureName connecting"
    isEnabled -> "$featureName enabled. Tap to disable"
    else -> "$featureName disabled. Tap to enable"
}

// Trivia dismiss
contentDescription = "Dismiss trivia fact"

// Trivia follow-up
contentDescription = "Tell me more about this topic"

// Language picker
contentDescription = "$languageName. ${if (selected) "Selected" else "Tap to select"}"
```

### Semantic Grouping

```kotlin
// Subtitle overlay
.accessibilityElement(children = .combine)
.accessibilityLabel("Subtitle: $translatedText. Original: $originalText")

// Trivia banner
.accessibilityElement(children = .combine)
.accessibilityLabel("AI Trivia. $category category. $factText. ${if (relatedPerson != null) "Related to $relatedPerson" else ""}")
```

---

## Implementation Checklist

### Phase 1: Critical Fixes
- [ ] Increase touch target sizes to 48dp minimum
- [ ] Add content descriptions to all interactive elements
- [ ] Replace MaterialTheme surfaces with glassMorphism modifier
- [ ] Implement error state UI

### Phase 2: Polish
- [ ] Add haptic feedback to toggle actions
- [ ] Implement dynamic bottom padding
- [ ] Add loading spinner for connecting state
- [ ] Add reconnection toast

### Phase 3: Enhancements
- [ ] Implement backdrop blur (Android 12+)
- [ ] Add first-time onboarding tooltip
- [ ] Add RTL layout support
- [ ] Increase trivia text size to 12sp

---

## Design Tokens Export

```kotlin
// For use in Android Studio layout preview
object LiveAIDesignTokens {
    // Overlay dimensions
    const val SUBTITLE_BOTTOM_PADDING = 40 // dp
    const val TRIVIA_MAX_WIDTH = 320 // dp
    const val AI_PANEL_HEIGHT_PHONE = 48 // dp
    const val AI_PANEL_HEIGHT_TABLET = 56 // dp

    // Touch targets
    const val MIN_TOUCH_TARGET = 48 // dp
    const val ICON_BUTTON_SIZE = 36 // dp (visual)
    const val ICON_BUTTON_PADDING = 6 // dp (to reach 48dp)

    // Animation durations
    const val FADE_DURATION = 150L // ms
    const val SLIDE_DURATION = 300L // ms
    const val SUBTITLE_AUTO_DISMISS = 5000L // ms
    const val DUBBING_AUTO_DISMISS = 4000L // ms
    const val TRIVIA_AUTO_DISMISS = 8000L // ms
}
```

---

**Design Specification Version:** 1.0
**Last Updated:** February 16, 2026
**Platform:** Android (Material Design 3)
**Design System:** Bayit+ Glass Components
**Status:** Implementation Ready (with critical fixes)
