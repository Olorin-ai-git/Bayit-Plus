# StyleSheet to TailwindCSS Migration Status

## Overview
Migration of React Native StyleSheet.create() to TailwindCSS (NativeWind) className props in iOS mobile app.

## Progress
- **Total Files**: 41
- **Completed**: 8
- **Remaining**: 33
- **Success Rate**: 19.5%

## Completed Files ✅
1. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/AppContent.tsx`
2. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/navigation/TabBar.tsx`
3. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/player/ChapterMarkers.tsx`
4. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/player/ChapterListMobile.tsx`
5. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/player/MobileVideoPlayer.tsx`
6. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/player/MobileAudioPlayer.tsx`
7. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/voice/VoiceCommandButton.tsx`
8. `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src/components/voice/VoiceWaveform.tsx`

## Remaining Files (33)

### Voice Components (5 files)
- `./components/voice/ProactiveSuggestionBanner.tsx`
- `./components/voice/VoiceStatusIndicator.tsx`
- `./components/voice/VoiceCommandHistory.tsx`
- `./components/voice/VoiceResponseDisplay.tsx`
- `./components/voice/VoiceSearchModal.tsx`
- `./components/voice/VoiceSettings.tsx`

### Widget Components (2 files)
- `./components/widgets/PiPWidgetContainer.tsx`
- `./components/widgets/PiPWidgetManager.tsx`

### Modals (1 file)
- `./components/SubscriptionGateModal.tsx` (PARTIAL - imports updated only)

### Screen Files (25 files)
- `./screens/BillingScreenMobile.tsx`
- `./screens/ChildrenScreenMobile.tsx`
- `./screens/DownloadsScreenMobile.tsx`
- `./screens/EPGScreenMobile.tsx`
- `./screens/FavoritesScreenMobile.tsx`
- `./screens/FlowsScreenMobile.tsx`
- `./screens/HomeScreenMobile.tsx`
- `./screens/JudaismScreenMobile.tsx`
- `./screens/LanguageSettingsScreen.tsx`
- `./screens/LiveTVScreenMobile.tsx`
- `./screens/MovieDetailScreenMobile.tsx`
- `./screens/NotificationSettingsScreen.tsx`
- `./screens/PlayerScreenMobile.tsx`
- `./screens/PodcastsScreenMobile.tsx`
- `./screens/ProfileScreenMobile.tsx`
- `./screens/SearchScreenMobile.tsx`
- `./screens/SecurityScreenMobile.tsx`
- `./screens/SeriesDetailScreenMobile.tsx`
- `./screens/SettingsScreenMobile.tsx`
- `./screens/SubscriptionScreenMobile.tsx`
- `./screens/VODScreenMobile.tsx`
- `./screens/VoiceOnboardingScreen.tsx`
- `./screens/WatchlistScreenMobile.tsx`
- `./screens/YoungstersScreenMobile.tsx`

## Migration Pattern

### Step 1: Remove StyleSheet import
```tsx
// BEFORE
import { View, Text, StyleSheet } from 'react-native';

// AFTER
import { View, Text } from 'react-native';
```

### Step 2: Convert style props to className
```tsx
// BEFORE
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>

// AFTER
<View className="flex-1 bg-black p-4">
  <Text className="text-white text-xl font-bold">Hello</Text>
</View>
```

### Step 3: Remove StyleSheet.create() block
```tsx
// BEFORE
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

// AFTER
// (delete entirely)
```

## Conversion Reference

### Common Style Mappings

| StyleSheet Property | TailwindCSS className |
|---------------------|----------------------|
| `flex: 1` | `flex-1` |
| `flexDirection: 'row'` | `flex-row` |
| `flexDirection: 'column'` | `flex-col` |
| `alignItems: 'center'` | `items-center` |
| `justifyContent: 'center'` | `justify-center` |
| `padding: 16` | `p-4` (16px = 4 * 4px) |
| `paddingHorizontal: 16` | `px-4` |
| `paddingVertical: 16` | `py-4` |
| `margin: 16` | `m-4` |
| `borderRadius: 8` | `rounded-lg` |
| `borderRadius: 16` | `rounded-2xl` |
| `backgroundColor: '#000'` | `bg-black` |
| `color: '#fff'` | `text-white` |
| `fontSize: 14` | `text-sm` |
| `fontSize: 16` | `text-base` |
| `fontSize: 18` | `text-lg` |
| `fontSize: 20` | `text-xl` |
| `fontWeight: '500'` | `font-medium` |
| `fontWeight: '600'` | `font-semibold` |
| `fontWeight: '700'` | `font-bold` |
| `position: 'absolute'` | `absolute` |
| `position: 'relative'` | `relative` |
| `top: 0` | `top-0` |
| `bottom: 0` | `bottom-0` |
| `left: 0` | `left-0` |
| `right: 0` | `right-0` |
| `width: '100%'` | `w-full` |
| `height: '100%'` | `h-full` |
| `opacity: 0.5` | `opacity-50` |
| `zIndex: 10` | `z-10` |

### Special Cases

#### Shadow (iOS)
```tsx
// BEFORE (StyleSheet)
style={{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8, // Android
}}

// AFTER (TailwindCSS + inline style)
className="shadow-lg"
style={{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
}}
// Note: Complex shadows require inline style prop
```

#### Dynamic Colors (from theme)
```tsx
// BEFORE
style={[styles.text, { color: colors.primary }]}

// AFTER (inline style when using theme variables)
className="text-base font-medium"
style={{ color: colors.primary }}
```

#### Conditional Styles
```tsx
// BEFORE
style={[styles.button, isActive && styles.buttonActive]}

// AFTER
className={`px-4 py-2 rounded-lg ${isActive ? 'bg-purple-600' : 'bg-gray-600'}`}
```

#### RTL Support
```tsx
// BEFORE
style={[styles.row, isRTL && styles.rowRTL]}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowRTL: { flexDirection: 'row-reverse' },
});

// AFTER
className={isRTL ? 'flex-row-reverse' : 'flex-row'}
```

## Tailwind Spacing Scale
- 0 = 0px
- 1 = 4px
- 2 = 8px
- 3 = 12px
- 4 = 16px
- 5 = 20px
- 6 = 24px
- 8 = 32px
- 10 = 40px
- 12 = 48px
- 16 = 64px
- 20 = 80px

## Next Steps

1. **Voice Components** (5 files) - High priority
   - ProactiveSuggestionBanner.tsx
   - VoiceStatusIndicator.tsx
   - VoiceCommandHistory.tsx
   - VoiceResponseDisplay.tsx
   - VoiceSearchModal.tsx
   - VoiceSettings.tsx

2. **Widget Components** (2 files)
   - PiPWidgetContainer.tsx
   - PiPWidgetManager.tsx

3. **Complete SubscriptionGateModal** (1 file) - Partially done
   - Large file with complex layout
   - Imports already updated
   - Need to migrate JSX and remove styles block

4. **Screen Files** (25 files) - Largest category
   - Start with simpler screens
   - Settings screens first (LanguageSettingsScreen, NotificationSettingsScreen, SecurityScreenMobile, SettingsScreenMobile)
   - Content screens next (HomeScreenMobile, SearchScreenMobile, etc.)
   - Detail screens last (MovieDetailScreenMobile, SeriesDetailScreenMobile, PlayerScreenMobile)

## Commands

### Check remaining files
```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src
find . -name "*.tsx" -exec grep -l "StyleSheet.create" {} \;
```

### Count remaining
```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src
find . -name "*.tsx" -exec grep -l "StyleSheet.create" {} \; | wc -l
```

### Verify migration
```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/src
# Should return no results when complete
grep -r "StyleSheet.create" . --include="*.tsx"
```

## Notes
- All files use NativeWind for TailwindCSS support
- Colors from `../theme` can be used via inline style prop when needed
- Complex shadows require inline `style` prop (TailwindCSS limitation in RN)
- Animated components may need inline `style` for animated values
- Always test on iOS Simulator after migration
