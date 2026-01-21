# StyleSheet to TailwindCSS Migration Guide

## Overview
This guide documents the systematic migration of 24+ files from React Native StyleSheet to TailwindCSS/NativeWind.

## Migration Status

### Completed Files
- [x] VerificationModal.tsx

### Files Requiring Migration
- [ ] TrendingRow.tsx
- [ ] InteractiveSubtitles.tsx
- [ ] GlassCarousel.tsx
- [ ] CinematicHero.tsx
- [ ] SupportTicketList.tsx
- [ ] SupportFAQ.tsx
- [ ] VoiceWaveform.tsx
- [ ] SupportSearch.tsx
- [ ] WizardEffects.tsx
- [ ] LanguageSelector.tsx
- [ ] UserAccountMenu.tsx
- [ ] TelAvivRow.tsx
- [ ] judaism/ShabbatModeBanner.tsx
- [ ] judaism/ShabbatEveSection.tsx
- [ ] CultureCityRow.tsx
- [ ] CultureTrendingRow.tsx
- [ ] flows/ContentItemCard.tsx
- [ ] flows/FlowItemCard.tsx
- [ ] flows/DaySelector.tsx
- [ ] DualClock.tsx
- [ ] JerusalemRow.tsx
- [ ] VoiceSearchButton.tsx
- [ ] player/AudioTrackSelector.tsx
- [ ] ai/BayitMascot.tsx

## Conversion Reference

### Common StyleSheet to TailwindCSS Mappings

#### Layout & Flexbox
```typescript
// StyleSheet
flex: 1 → className="flex-1"
flexDirection: 'row' → className="flex-row"
flexDirection: 'column' → className="flex-col"
justifyContent: 'center' → className="justify-center"
justifyContent: 'space-between' → className="justify-between"
alignItems: 'center' → className="items-center"
alignItems: 'flex-start' → className="items-start"
```

#### Spacing
```typescript
padding: 16 → className="p-4"
paddingHorizontal: 16 → className="px-4"
paddingVertical: 16 → className="py-4"
margin: 8 → className="m-2"
marginHorizontal: 16 → className="mx-4"
marginTop: 12 → className="mt-3"
gap: 8 → className="gap-2"
```

#### Sizing
```typescript
width: '100%' → className="w-full"
height: 100 → className="h-[100px]"
minHeight: 200 → className="min-h-[200px]"
maxWidth: 500 → className="max-w-[500px]"
```

#### Borders & Radius
```typescript
borderRadius: 8 → className="rounded-lg"
borderRadius: 12 → className="rounded-xl"
borderRadius: 9999 → className="rounded-full"
borderWidth: 2 → className="border-2"
borderColor: '#xxx' → className="border-[#xxx]"
```

#### Background & Colors
```typescript
backgroundColor: '#1a1525' → className="bg-[#1a1525]"
backgroundColor: 'rgba(0,0,0,0.2)' → className="bg-black/20"
color: '#fff' → className="text-white"
color: colors.primary → className="text-purple-500"
```

#### Typography
```typescript
fontSize: 16 → className="text-base"
fontSize: 14 → className="text-sm"
fontSize: 18 → className="text-lg"
fontSize: 24 → className="text-2xl"
fontWeight: 'bold' → className="font-bold"
fontWeight: '600' → className="font-semibold"
textAlign: 'center' → className="text-center"
lineHeight: 22 → className="leading-[22px]"
```

#### Positioning
```typescript
position: 'absolute' → className="absolute"
position: 'relative' → className="relative"
top: 0 → className="top-0"
left: 0 → className="left-0"
right: 0 → className="right-0"
bottom: 0 → className="bottom-0"
zIndex: 10 → className="z-10"
```

#### Opacity & Effects
```typescript
opacity: 0.5 → className="opacity-50"
opacity: 0.7 → className="opacity-70"
```

### Special Cases - Keep style={{}}

Only use inline `style={{}}` for:
1. **Animated values**: `style={{ opacity: fadeAnim }}`
2. **Dynamic RTL**: `style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}`
3. **Computed values**: `style={{ width: computedWidth }}`
4. **Transform arrays**: `style={{ transform: [{ scale: scaleAnim }] }}`

### Migration Steps Per File

1. **Remove StyleSheet import**
   ```typescript
   // Remove: import { StyleSheet } from 'react-native';
   // Or change to: import { View, Text } from 'react-native';
   ```

2. **Remove theme imports (optional)**
   ```typescript
   // Remove if not used elsewhere:
   import { colors, spacing, fontSize, borderRadius } from '../theme';
   ```

3. **Convert JSX**
   - Find all `style={styles.xyz}`
   - Replace with `className="..."`
   - Keep dynamic styles as `style={{}}`

4. **Delete StyleSheet.create block**
   - Remove entire `const styles = StyleSheet.create({...});`

5. **Test**
   - Ensure layout looks identical
   - Check RTL support
   - Verify animations still work

## Platform-Specific Considerations

### Mobile (iOS/Android)
- Use spacing scale: p-2 (8px), p-4 (16px), p-6 (24px)
- Text sizes: text-sm (14px), text-base (16px), text-lg (18px)

### tvOS
- Larger touch targets: min 44px buttons
- Larger text: text-lg minimum
- Focus states: use `focus:` prefix

### Web
- Hover states: use `hover:` prefix
- Responsive: use `md:`, `lg:` prefixes

## Color Reference

```typescript
colors.text → text-white
colors.textSecondary → text-white/70
colors.textMuted → text-white/50
colors.primary → text-purple-500
colors.error → text-red-500
colors.success → text-green-500
colors.warning → text-yellow-500
colors.background → bg-[#0d0d1a]

// Transparency
bg-black/10 → 10% opacity
bg-black/20 → 20% opacity
bg-white/10 → 10% white overlay
```

## Common Patterns

### Card/Container
```typescript
// Before
style={styles.card}
// StyleSheet
card: {
  padding: 16,
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.05)',
}

// After
className="p-4 rounded-xl bg-white/5"
```

### Button
```typescript
// Before
style={styles.button}
// StyleSheet
button: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 8,
  backgroundColor: colors.primary,
}

// After
className="flex-row items-center gap-2 px-4 py-3 rounded-lg bg-purple-500"
```

### Focus State (TV)
```typescript
// Before
style={[styles.item, isFocused && styles.itemFocused]}
// StyleSheet
item: { borderWidth: 2, borderColor: 'transparent' }
itemFocused: { borderColor: colors.primary }

// After
className={`border-2 ${isFocused ? 'border-purple-500' : 'border-transparent'}`}
```

## Automated Migration Tips

For bulk migrations, use find/replace with regex:

1. **Remove StyleSheet import**
   ```
   Find: import.*StyleSheet.*from 'react-native';?\n
   Replace: (empty)
   ```

2. **Simple style conversions** (manual review needed)
   ```
   Find: style={styles\.([\w]+)}
   Replace: className="[manually convert]"
   ```

3. **Delete StyleSheet.create block**
   ```
   Find: const styles = StyleSheet\.create\({[.\s\S]*?}\);
   Replace: (empty)
   ```

## Testing Checklist

After migrating each file:
- [ ] File compiles without errors
- [ ] Visual layout matches original
- [ ] RTL support still works
- [ ] Focus states work (TV)
- [ ] Animations still work
- [ ] Responsive behavior correct
- [ ] No console warnings

## Notes

- Some files use complex animations with StyleSheet - keep those as `style={{}}`
- Platform-specific styles (Platform.OS === 'tv') can use ternary className
- Dynamic styles from theme should be converted to Tailwind classes
- Consider using `cn()` helper for complex conditional classes

## Completion Tracking

Total Files: 24
Completed: 1
Remaining: 23
Progress: 4%

Last Updated: 2026-01-21
