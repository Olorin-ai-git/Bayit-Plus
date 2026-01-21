# StyleSheet to TailwindCSS Migration Status

## web/src/components/player/ Migration Progress

### ✅ COMPLETED (9/15 files)
1. **FullscreenVideoOverlay.tsx** - Fully migrated
2. **AudioPlayer.tsx** - Fully migrated
3. **RecordingStatusIndicator.tsx** - Fully migrated
4. **SubtitleOverlay.tsx** - Fully migrated
5. **ChapterCard.tsx** - Fully migrated
6. **ProgressBar.tsx** - Fully migrated
7. **LiveSubtitleOverlay.tsx** - Fully migrated
8. **RecordButton.tsx** - Fully migrated
9. **LiveSubtitleControls.tsx** - Fully migrated
10. **LiveSubtitleControls.styles.ts** - Converted to constants only
11. **ChaptersPanel.tsx** - Fully migrated

### 🔄 REMAINING (4/15 files - Large/Complex)
1. **SubtitleControls.tsx** (650 lines)
2. **SettingsPanel.tsx** (303 lines)
3. **VideoPlayer.tsx** (550 lines)
4. **PlayerControls.tsx** (277 lines)
5. **ChapterTimeline.tsx** (245 lines)

## Migration Pattern Reference

### StyleSheet → TailwindCSS Conversion Guide

| StyleSheet Property | TailwindCSS Class |
|---------------------|-------------------|
| `flex: 1` | `flex-1` |
| `flexDirection: 'row'` | `flex-row` |
| `flexDirection: 'column'` | `flex-col` |
| `justifyContent: 'center'` | `justify-center` |
| `justifyContent: 'space-between'` | `justify-between` |
| `alignItems: 'center'` | `items-center` |
| `padding: 16` | `p-4` (16px = 4 * 4px) |
| `paddingHorizontal: 16` | `px-4` |
| `paddingVertical: 16` | `py-4` |
| `margin: 8` | `m-2` (8px = 2 * 4px) |
| `marginTop: 8` | `mt-2` |
| `gap: 8` | `gap-2` |
| `borderRadius: 8` | `rounded-lg` |
| `borderRadius: 4` | `rounded` |
| `borderRadius: 9999` | `rounded-full` |
| `backgroundColor: 'rgba(0,0,0,0.2)'` | `bg-black/20` |
| `backgroundColor: 'rgba(255,255,255,0.1)'` | `bg-white/10` |
| `color: '#fff'` | `text-white` |
| `fontSize: 16` | `text-base` |
| `fontSize: 14` | `text-sm` |
| `fontSize: 12` | `text-xs` |
| `fontSize: 18` | `text-lg` |
| `fontSize: 20` | `text-xl` |
| `fontSize: 24` | `text-2xl` |
| `fontWeight: 'bold'` | `font-bold` |
| `fontWeight: '600'` | `font-semibold` |
| `fontWeight: '500'` | `font-medium` |
| `position: 'absolute'` | `absolute` |
| `position: 'relative'` | `relative` |
| `zIndex: 100` | `z-[100]` |
| `width: '100%'` | `w-full` |
| `height: '100%'` | `h-full` |
| `overflow: 'hidden'` | `overflow-hidden` |
| `opacity: 0.5` | `opacity-50` |

### Keep as style={{}} (Dynamic Values)
- Shadow properties (shadowColor, shadowOffset, shadowOpacity, shadowRadius)
- backgroundColor with colors.primary/colors.text etc
- Dynamic width/height calculations
- Transform arrays
- RTL writingDirection
- textShadow properties

## Next Steps for Remaining Files

For each remaining file:

1. **Remove StyleSheet import**
```tsx
// Before
import { View, Text, StyleSheet } from 'react-native'

// After
import { View, Text } from 'react-native'
```

2. **Convert style={styles.xyz} to className="..."**
```tsx
// Before
<View style={styles.container}>

// After
<View className="flex-row items-center gap-4">
```

3. **Handle conditional styles**
```tsx
// Before
style={[styles.button, isActive && styles.buttonActive]}

// After
className={`px-4 py-2 rounded-lg ${isActive ? 'bg-purple-500' : 'bg-white/10'}`}
```

4. **Keep dynamic styles in style prop**
```tsx
// Keep shadows, colors from theme, transforms
style={{
  backgroundColor: colors.primary,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 8,
}}
```

5. **Delete entire StyleSheet.create() block at bottom**

## Files Modified

```
web/src/components/player/FullscreenVideoOverlay.tsx
web/src/components/player/AudioPlayer.tsx
web/src/components/player/RecordingStatusIndicator.tsx
web/src/components/player/SubtitleOverlay.tsx
web/src/components/player/ChapterCard.tsx
web/src/components/player/ProgressBar.tsx
web/src/components/player/LiveSubtitleOverlay.tsx
web/src/components/player/RecordButton.tsx
web/src/components/player/LiveSubtitleControls.tsx
web/src/components/player/LiveSubtitleControls.styles.ts
web/src/components/player/ChaptersPanel.tsx
```

## Progress: 11/15 Complete (73%)
