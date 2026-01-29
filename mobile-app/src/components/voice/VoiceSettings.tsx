/**
 * Voice Settings Component
 *
 * Allows users to configure voice feature preferences:
 * - Enable/disable voice features
 * - Language selection
 * - Wake word sensitivity
 * - Voice response settings
 * - Command history management
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { useConversationContextMobile } from '../../hooks/useConversationContextMobile';
import { AvatarPreferences } from './AvatarPreferences';

interface VoiceSettingsProps {
  onClose?: () => void;
  onSettingsChange?: (settings: VoiceSettingsState) => void;
}

export interface VoiceSettingsState {
  voiceEnabled: boolean;
  language: string;
  wakeSensitivity: number; // 0.0-1.0
  respondWithAudio: boolean;
  recordCommandHistory: boolean;
  microphonePermission: boolean;
}

const DEFAULT_SETTINGS: VoiceSettingsState = {
  voiceEnabled: true,
  language: 'en',
  wakeSensitivity: 0.7,
  respondWithAudio: true,
  recordCommandHistory: true,
  microphonePermission: true,
};

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  onClose,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<VoiceSettingsState>(DEFAULT_SETTINGS);
  const conversationContext = useConversationContextMobile();
  const notifications = useNotifications();

  const handleSettingChange = useCallback(
    (key: keyof VoiceSettingsState, value: any) => {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
    },
    [settings, onSettingsChange]
  );

  const handleClearHistory = useCallback(() => {
    notifications.show({
      level: 'warning',
      message: 'Are you sure you want to delete all voice command history?',
      title: 'Clear Command History',
      dismissable: true,
      action: {
        label: 'Delete',
        type: 'action',
        onPress: () => {
          conversationContext.clear();
          notifications.showSuccess('Command history cleared', 'Success');
        },
      },
    });
  }, [conversationContext, notifications]);

  const handleResetSettings = useCallback(() => {
    notifications.show({
      level: 'warning',
      message: 'Reset voice settings to defaults?',
      title: 'Reset Settings',
      dismissable: true,
      action: {
        label: 'Reset',
        type: 'action',
        onPress: () => {
          setSettings(DEFAULT_SETTINGS);
          onSettingsChange?.(DEFAULT_SETTINGS);
        },
      },
    });
  }, [onSettingsChange, notifications]);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
        <TouchableOpacity
          onPress={onClose}
          accessible
          accessibilityLabel="Close voice settings"
          accessibilityRole="button"
          accessibilityHint="Closes the voice settings screen"
          style={{ minWidth: 44, minHeight: 44 }}
          className="justify-center"
        >
          <Text
            className="text-sm text-blue-600 font-medium"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            ✕ Close
          </Text>
        </TouchableOpacity>
        <Text
          className="text-lg font-semibold text-white"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          Voice Settings
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Voice Features Toggle */}
        <Section title="Voice Features">
          <SettingRow
            label="Enable Voice Commands"
            description="Activate voice search and commands"
            value={settings.voiceEnabled}
            onValueChange={(value) =>
              handleSettingChange('voiceEnabled', value)
            }
          />
        </Section>

        {/* Language Selection */}
        <Section title="Language">
          <TouchableOpacity
            className="py-3 border-b border-slate-700"
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-center">
              <Text
                className="text-sm font-medium text-slate-100"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                Voice Language
              </Text>
              <Text
                className="text-sm text-slate-400"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                {getLanguageName(settings.language)}
              </Text>
            </View>
          </TouchableOpacity>
          <View className="flex-row gap-2 mt-3">
            {['en', 'he', 'es'].map((lang) => (
              <TouchableOpacity
                key={lang}
                className={`flex-1 py-2 px-3 rounded bg-slate-900 border ${
                  settings.language === lang
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-700'
                } items-center`}
                onPress={() => handleSettingChange('language', lang)}
                accessible
                accessibilityLabel={`Select ${getLanguageName(lang)} language`}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.language === lang }}
                accessibilityHint={`Changes voice language to ${getLanguageName(lang)}`}
              >
                <Text
                  className={`text-xs font-medium ${
                    settings.language === lang
                      ? 'text-white'
                      : 'text-slate-200'
                  }`}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {getLanguageName(lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Wake Word Settings */}
        <Section title="Wake Word Detection">
          <SensitivitySlider
            value={settings.wakeSensitivity}
            onValueChange={(value) =>
              handleSettingChange('wakeSensitivity', value)
            }
            label="Sensitivity"
            description="Higher = more responsive, may trigger more false positives"
          />
          <Text
            className="text-xs text-slate-600 mt-2 italic"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            Current sensitivity: {(settings.wakeSensitivity * 100).toFixed(0)}%
          </Text>
        </Section>

        {/* Avatar Display Preferences */}
        <Section title="Avatar Display">
          <AvatarPreferences />
        </Section>

        {/* Voice Response Settings */}
        <Section title="Voice Response">
          <SettingRow
            label="Audio Responses"
            description="Respond with voice instead of text"
            value={settings.respondWithAudio}
            onValueChange={(value) =>
              handleSettingChange('respondWithAudio', value)
            }
          />
        </Section>

        {/* Privacy Settings */}
        <Section title="Privacy & History">
          <SettingRow
            label="Record Command History"
            description="Save voice commands for quick access"
            value={settings.recordCommandHistory}
            onValueChange={(value) =>
              handleSettingChange('recordCommandHistory', value)
            }
          />
          <Text
            className="text-xs text-slate-600 mt-2 italic"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            History helps improve voice recognition accuracy
          </Text>
        </Section>

        {/* Permissions */}
        <Section title="Permissions">
          <View className="py-3">
            <View className="flex-row justify-between items-center">
              <View>
                <Text
                  className="text-sm font-medium text-slate-100 mb-0.5"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  Microphone
                </Text>
                <Text
                  className="text-xs text-slate-400 mt-0.5"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {settings.microphonePermission ? '✓ Granted' : '✗ Denied'}
                </Text>
              </View>
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: settings.microphonePermission
                    ? '#10B981'
                    : '#EF4444',
                }}
              />
            </View>
          </View>
          <Text
            className="text-xs text-slate-600 mt-2 italic"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            Microphone access is required for voice commands
          </Text>
        </Section>

        {/* Voice Commands Info */}
        <Section title="Supported Commands">
          <VoiceCommandInfo />
        </Section>

        {/* Danger Zone */}
        <Section title="Advanced">
          <TouchableOpacity
            className="py-3 px-3 bg-red-900 rounded items-center mt-2 border border-red-800"
            onPress={handleClearHistory}
            accessible
            accessibilityLabel="Clear command history"
            accessibilityRole="button"
            accessibilityHint="Deletes all saved voice command history"
          >
            <Text
              className="text-xs font-semibold text-red-300"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Clear Command History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="py-3 px-3 bg-red-900 rounded items-center mt-2 border border-red-800"
            onPress={handleResetSettings}
            accessible
            accessibilityLabel="Reset settings to defaults"
            accessibilityRole="button"
            accessibilityHint="Resets all voice settings to default values"
          >
            <Text
              className="text-xs font-semibold text-red-300"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </Section>

        <View className="h-5" />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Helper Components
// ============================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View className="mb-2">
    <Text
      className="text-sm font-semibold text-slate-100 mb-3 uppercase tracking-wide"
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3}
    >
      {title}
    </Text>
    <View className="bg-slate-800 rounded-lg p-3 overflow-hidden">
      {children}
    </View>
  </View>
);

interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  value,
  onValueChange,
}) => (
  <View className="flex-row justify-between items-center py-3 border-b border-slate-700">
    <View className="flex-1 mr-3">
      <Text
        className="text-sm font-medium text-slate-100 mb-0.5"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      {description && (
        <Text
          className="text-xs text-slate-400 mt-0.5"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {description}
        </Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#475569', true: '#3B82F6' }}
      thumbColor={value ? '#60A5FA' : '#94A3B8'}
      accessible
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityHint={description || `Toggle ${label}`}
    />
  </View>
);

interface SensitivitySliderProps {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  description?: string;
}

const SensitivitySlider: React.FC<SensitivitySliderProps> = ({
  value,
  onValueChange,
  label,
  description,
}) => (
  <View className="py-3 border-b border-slate-700">
    <View className="mb-3">
      <Text
        className="text-sm font-medium text-slate-100 mb-0.5"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      {description && (
        <Text
          className="text-xs text-slate-400 mt-0.5"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {description}
        </Text>
      )}
    </View>
    <View className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
      <View
        className="h-full bg-blue-600"
        style={{ width: `${value * 100}%` }}
      />
    </View>
    <View className="flex-row justify-between">
      <Text
        className="text-xs text-slate-600"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        Low
      </Text>
      <Text
        className="text-xs text-slate-600"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        High
      </Text>
    </View>
  </View>
);

const VoiceCommandInfo: React.FC = () => (
  <View className="gap-2">
    <CommandExample
      command="Play [movie/series name]"
      example="'Play Fauda'"
    />
    <CommandExample command="Search [query]" example="'Search documentaries'" />
    <CommandExample command="Pause / Resume" example="'Pause' or 'Resume'" />
    <CommandExample
      command="Next / Previous"
      example="'Next episode' or 'Previous'"
    />
    <CommandExample command="Show favorites" example="'Show my favorites'" />
    <CommandExample command="Get recommendations" example="'What should I watch?'" />
  </View>
);

interface CommandExampleProps {
  command: string;
  example: string;
}

const CommandExample: React.FC<CommandExampleProps> = ({ command, example }) => (
  <View className="py-2 border-b border-slate-700">
    <Text
      className="text-xs font-semibold text-slate-100 mb-0.5"
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3}
    >
      {command}
    </Text>
    <Text
      className="text-xs text-slate-400 italic"
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3}
    >
      e.g., {example}
    </Text>
  </View>
);

// ============================================
// Helper Functions
// ============================================

const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    en: 'English',
    he: 'Hebrew (עברית)',
    es: 'Spanish (Español)',
  };
  return names[code] || code;
};
