# Voice Settings Module

Modular refactored voice settings with clean separation of concerns.

## Structure

```
voice/
├── VoiceSettingsMain.tsx       # Main orchestrator (89 lines)
├── index.ts                     # Barrel exports
├── types.ts                     # Shared type definitions
├── components/                  # UI components
│   ├── AccessibilitySection.tsx        (123 lines)
│   ├── HybridFeedbackSection.tsx       (68 lines)
│   ├── SavingIndicator.tsx             (31 lines)
│   ├── Toggle.tsx                      (47 lines)
│   ├── TTSSection.tsx                  (189 lines)
│   ├── VoiceModeCard.tsx               (97 lines)
│   ├── VoiceModeSection.tsx            (138 lines)
│   ├── VoiceSearchSection.tsx          (46 lines)
│   ├── VoiceSettingRow.tsx             (73 lines)
│   ├── VoiceSettingsHeader.tsx         (55 lines)
│   ├── WakeWordSection.tsx             (171 lines)
│   └── index.ts                        # Component exports
└── hooks/                       # Custom hooks
    ├── useVoiceSettings.ts             (51 lines)
    └── index.ts                        # Hook exports
```

## Components

### Core Components

- **VoiceSettingsMain**: Main orchestrator component that composes all sections
- **VoiceSettingsHeader**: Page header with icon and description

### Section Components

- **VoiceModeSection**: Voice operation mode selection (Voice Only, Hybrid, Classic)
- **TTSSection**: Text-to-speech settings with volume and speed controls
- **HybridFeedbackSection**: Voice feedback settings for hybrid mode
- **VoiceSearchSection**: Voice search toggle
- **WakeWordSection**: Wake word detection settings with sensitivity controls
- **AccessibilitySection**: Accessibility features including text size and contrast

### Shared Components

- **VoiceSettingRow**: Reusable setting row with label, description, and toggle
- **VoiceModeCard**: Card component for mode selection
- **Toggle**: Reusable toggle switch component
- **SavingIndicator**: Loading indicator shown during save operations

## Hooks

### useVoiceSettings

Custom hook that encapsulates voice settings state management logic.

**Returns:**
- `preferences`: Current voice preferences
- `loading`: Loading state
- `saving`: Saving state
- `isRTL`: RTL language detection
- `actions`: Object containing all action methods

**Actions:**
- `toggleSetting`: Toggle boolean settings
- `setTextSize`: Update text size
- `setWakeWordEnabled`: Toggle wake word
- `setWakeWordSensitivity`: Update wake word sensitivity
- `setMode`: Change voice mode
- `setVoiceFeedbackEnabled`: Toggle voice feedback
- `setTTSVolume`: Update TTS volume
- `setTTSSpeed`: Update TTS speed

## Types

Shared type definitions exported from `types.ts`:

- `VoicePreferences`: Voice preferences interface
- `ToggleProps`: Toggle component props
- `SettingRowProps`: Setting row component props
- `VoiceModeOption`: Voice mode configuration
- `SensitivityOption`: Sensitivity level configuration
- Re-exports: `VoiceMode`, `TextSize`, `VADSensitivity`

## Usage

### Basic Import

```typescript
import VoiceSettings from '@/components/settings/VoiceSettings';

function ProfilePage() {
  return <VoiceSettings />;
}
```

### Using Individual Components

```typescript
import { VoiceModeSection, TTSSection } from '@/components/settings/voice';

function CustomVoiceSettings() {
  const { preferences, actions } = useVoiceSettings();

  return (
    <>
      <VoiceModeSection
        selectedMode={preferences.voice_mode}
        isRTL={false}
        onModeChange={actions.setMode}
      />
      <TTSSection
        ttsEnabled={preferences.tts_enabled}
        ttsVolume={preferences.tts_volume}
        ttsSpeed={preferences.tts_speed}
        isRTL={false}
        onToggleTTS={() => actions.toggleSetting('tts_enabled')}
        onVolumeChange={actions.setTTSVolume}
        onSpeedChange={actions.setTTSSpeed}
      />
    </>
  );
}
```

### Using the Hook

```typescript
import { useVoiceSettings } from '@/components/settings/voice';

function MyComponent() {
  const { preferences, loading, saving, actions } = useVoiceSettings();

  if (loading) return <Spinner />;

  return (
    <button onClick={() => actions.setMode(VoiceMode.HYBRID)}>
      Enable Hybrid Mode
    </button>
  );
}
```

## Backward Compatibility

The original `VoiceSettings.tsx` file now re-exports from the modular structure:

```typescript
// web/src/components/settings/VoiceSettings.tsx
export { VoiceSettings as default } from './voice';
```

All existing imports continue to work without changes:

```typescript
import VoiceSettings from '@/components/settings/VoiceSettings'; // ✅ Still works
```

## File Size Compliance

All files comply with the <200 line requirement (main orchestrator <400):

- **Largest file**: TTSSection.tsx (189 lines) ✅
- **Main orchestrator**: VoiceSettingsMain.tsx (89 lines) ✅
- **Average component size**: ~85 lines ✅

## Design Principles

1. **Single Responsibility**: Each component handles one specific section
2. **Reusability**: Shared components (Toggle, VoiceSettingRow) used across sections
3. **Type Safety**: Full TypeScript coverage with shared type definitions
4. **Separation of Concerns**: Business logic in hooks, presentation in components
5. **RTL Support**: All components support right-to-left languages
6. **Accessibility**: Proper ARIA patterns and semantic HTML maintained
7. **No Hardcoded Values**: All strings use i18n, all styles use theme constants
8. **No Mocks/Stubs**: Full production-ready implementations throughout

## Dependencies

- `react-i18next`: Internationalization
- `@bayit/shared/theme`: Theme constants (colors, spacing, borderRadius)
- `@bayit/shared/ui`: GlassView component
- `@bayit/shared-types/voiceModes`: VoiceMode enum
- `@/stores/voiceSettingsStore`: State management
- `lucide-react`: Icons

## Testing Recommendations

1. **Component Tests**: Test each section component independently
2. **Integration Tests**: Test VoiceSettingsMain with all sections
3. **Hook Tests**: Test useVoiceSettings hook logic
4. **Accessibility Tests**: Verify ARIA attributes and keyboard navigation
5. **RTL Tests**: Verify layout in RTL languages

## Migration Notes

- Original 943-line monolithic file refactored into 16 modular files
- Main orchestrator reduced to 89 lines
- All functionality preserved with improved maintainability
- Backward compatibility maintained via re-export pattern
- Zero breaking changes for existing code
