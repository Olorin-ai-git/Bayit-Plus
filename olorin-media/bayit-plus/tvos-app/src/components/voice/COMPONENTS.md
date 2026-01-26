# TV Voice Components Reference

Quick reference guide for all 8 TV voice UI components.

## Component Matrix

| Component | Lines | Purpose | Focusable | Animated |
|-----------|-------|---------|-----------|----------|
| TVVoiceIndicator | 138 | Listening status | ✓ | ✓ |
| TVVoiceResponseDisplay | 172 | Response overlay | ✗ | ✓ |
| TVVoiceCommandHistory | 165 | Recent commands | ✓ | ✗ |
| TVVoiceSettings | 198 | Voice settings | ✓ | ✗ |
| TVProactiveSuggestionBanner | 199 | Suggestions | ✓ | ✓ |
| TVVoiceWaveform | 114 | Audio visualization | ✗ | ✓ |
| TVVoiceErrorAlert | 192 | Error display | ✓ | ✗ |
| TVVoicePermissionsScreen | 150 | Permission flow | ✓ | ✓ |

## Feature Comparison

### Focus Navigation
- TVVoiceIndicator: Pressable with focus ring
- TVVoiceCommandHistory: List items with focus
- TVVoiceSettings: All controls focusable (language, toggle, sliders)
- TVProactiveSuggestionBanner: Suggestion items + dismiss button
- TVVoiceErrorAlert: Retry and dismiss buttons
- TVVoicePermissionsScreen: All buttons focusable

### Animation
- TVVoiceIndicator: Pulsing scale animation
- TVVoiceResponseDisplay: Fade in/out (300ms)
- TVProactiveSuggestionBanner: Height animation
- TVVoiceWaveform: Bar height interpolation (12 bars)
- TVVoicePermissionsScreen: Step fade transitions

### Data Source
- TVVoiceCommandHistory: Zustand voiceStore.getLastNCommands()
- TVVoiceSettings: Local state + callbacks
- TVVoiceErrorAlert: Zustand voiceStore.error
- TVVoiceResponseDisplay: Zustand voiceStore.lastResponse
- TVVoiceIndicator: Zustand voiceStore.isListening

### Internationalization
All 9 components use react-i18next with `voice.*` namespace keys.

## Size Variants

**TVVoiceIndicator:**
- small: 60x60pt, 28pt icon
- medium: 80x80pt, 40pt icon (default)
- large: 120x120pt, 56pt icon

## Color Palette

All components use:
- Purple: #A855F7 (primary focus)
- Dark Purple: #6B21A8 (inactive)
- White: #FFFFFF (text)
- Gray: #9CA3AF (secondary text)
- Green: #10B981 (success)
- Red: #EF4444 (error)

## Safe Areas

- 60pt margins all sides (tvOS)
- TVVoiceIndicator: Centered
- TVVoiceSettings: Full screen with padding
- TVVoicePermissionsScreen: Full screen with scroll
- TVProactiveSuggestionBanner: Top banner, respects safe area

## Typography

**All components use:**
- Title: 48pt, fontWeight: 700
- Subtitle: 28pt, fontWeight: 600
- Body: 24pt, fontWeight: 500
- Button: 28pt, fontWeight: 700

Minimum body text: 28pt (10-foot readable)

## Supported Languages

All components support:
1. Hebrew (עברית) - RTL layout
2. English
3. Spanish (Español)
4. French (Français)

## State Management

### Voice Store Integration

**TVVoiceIndicator** uses:
- `isListening` - Shows pulsing effect
- `isProcessing` - Shows loading state

**TVVoiceResponseDisplay** uses:
- `lastResponse` - Message content
- `error` - Error object (type, message)

**TVVoiceCommandHistory** uses:
- `getLastNCommands(n)` - Selector for last N commands

**TVVoiceErrorAlert** uses:
- `error` - Error details
- `clearError()` - Clear error state

## Prop Examples

### Minimal Props
```typescript
// All components work with no props
<TVVoiceIndicator />
<TVVoiceResponseDisplay />
<TVVoiceCommandHistory />
<TVVoiceSettings language="he" wakeWordEnabled={true} ttsRate={1.0} />
<TVProactiveSuggestionBanner />
<TVVoiceWaveform />
<TVVoiceErrorAlert />
<TVVoicePermissionsScreen />
```

### Full Configuration
```typescript
<TVVoiceIndicator size="large" showLabel={true} onPress={handlePress} />
<TVVoiceResponseDisplay autoDismissMs={4000} onDismiss={handleDismiss} />
<TVVoiceCommandHistory maxItems={5} onSelectCommand={handleSelect} />
<TVVoiceSettings
  language="en"
  wakeWordEnabled={false}
  ttsRate={1.5}
  onLanguageChange={setLang}
  onWakeWordToggle={setWakeWord}
  onTTSRateChange={setRate}
/>
<TVProactiveSuggestionBanner
  suggestions={[...]}
  onSuggestionPress={handleSuggestion}
  onDismiss={handleDismiss}
  visible={true}
/>
<TVVoiceWaveform audioLevel={0.8} isListening={true} barCount={12} />
<TVVoiceErrorAlert onRetry={handleRetry} onDismiss={handleDismiss} />
<TVVoicePermissionsScreen
  onComplete={handleComplete}
  onCancel={handleCancel}
  onPermissionRequest={requestPermission}
/>
```

## Error Types (TVVoiceErrorAlert)

1. `microphone_permission` - Access not granted
2. `microphone_unavailable` - No mic available
3. `network_error` - Connection issue
4. `recognition_failed` - Couldn't understand command
5. `command_not_understood` - Invalid command
6. `execution_failed` - Command failed
7. `timeout` - Request too long
8. `unknown` - Generic error

## Accessibility

All components include:
- `accessible` prop
- `accessibilityLabel` - Descriptive text
- `accessibilityHint` - Optional context
- `accessibilityState` - For toggles
- Proper focus management for TV remote
- Screen reader support

## Performance Tips

1. **Memoization**: Components update only on prop changes
2. **Animation**: Uses `useNativeDriver: true` for 60fps
3. **List Rendering**: FlatList for command history
4. **Focus Management**: Efficient focus state updates

## Best Practices

1. Always provide accessibility labels
2. Use voice store for state management
3. Externalize all text via i18n
4. Test on tvOS simulator with D-pad
5. Maintain 10-foot readability
6. Use focus rings consistently
7. Support RTL layout

## Integration Flow

```
App
├── TVVoiceIndicator (header/footer)
├── TVProactiveSuggestionBanner (top)
├── TVVoiceCommandHistory (sidebar/panel)
├── TVVoiceWaveform (inline with indicator)
├── TVVoiceResponseDisplay (overlay)
├── TVVoiceSettings (settings screen)
├── TVVoiceErrorAlert (overlay)
└── TVVoicePermissionsScreen (onboarding)
```

## Maintenance

### Update Checklist
- [ ] Update i18n keys when text changes
- [ ] Update color tokens in voiceStyles.ts
- [ ] Test focus navigation
- [ ] Verify TVOs simulator appearance
- [ ] Check accessibility labels
- [ ] Test on actual Apple TV device
- [ ] Verify RTL layout with Hebrew

### Performance Monitoring
- Animation frame rate (60fps target)
- Memory usage
- Re-render counts
- Focus transition smoothness

## Troubleshooting

**Issue**: Focus ring not appearing
**Solution**: Check that component is inside `<Pressable>` or similar with `onFocus`/`onBlur`

**Issue**: Text too small
**Solution**: Minimum 28pt body text required for 10-foot display

**Issue**: Colors not showing
**Solution**: Verify LinearGradient is imported and working

**Issue**: i18n text not rendering
**Solution**: Check i18n key exists and initialization complete

## Version Info

- React Native tvOS: 0.76.3-0+
- React: 18.3.1+
- react-i18next: 15.0.2+
- Zustand: 5.0.9+
- LinearGradient: 2.8.3+

## Related Files

- `voiceStyles.ts` - Shared styles and constants
- `index.ts` - Component exports
- `README.md` - Full documentation
- `../../stores/voiceStore.ts` - Zustand store
