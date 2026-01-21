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
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useConversationContextMobile } from '../../hooks/useConversationContextMobile';

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

  const handleSettingChange = useCallback(
    (key: keyof VoiceSettingsState, value: any) => {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
    },
    [settings, onSettingsChange]
  );

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear Command History',
      'Are you sure you want to delete all voice command history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            conversationContext.clear();
            Alert.alert('Success', 'Command history cleared');
          },
        },
      ]
    );
  }, [conversationContext]);

  const handleResetSettings = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'Reset voice settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings(DEFAULT_SETTINGS);
            onSettingsChange?.(DEFAULT_SETTINGS);
          },
        },
      ]
    );
  }, [onSettingsChange]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Voice Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
            style={styles.languageBox}
            activeOpacity={0.7}
          >
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>Voice Language</Text>
              <Text style={styles.languageValue}>{getLanguageName(settings.language)}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.languageOptions}>
            {['en', 'he', 'es'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageOption,
                  settings.language === lang && styles.languageOptionActive,
                ]}
                onPress={() => handleSettingChange('language', lang)}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    settings.language === lang &&
                      styles.languageOptionTextActive,
                  ]}
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
          <Text style={styles.helperText}>
            Current sensitivity: {(settings.wakeSensitivity * 100).toFixed(0)}%
          </Text>
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
          <Text style={styles.helperText}>
            History helps improve voice recognition accuracy
          </Text>
        </Section>

        {/* Permissions */}
        <Section title="Permissions">
          <View style={styles.permissionBox}>
            <View style={styles.permissionItem}>
              <View>
                <Text style={styles.permissionLabel}>Microphone</Text>
                <Text style={styles.permissionStatus}>
                  {settings.microphonePermission ? '✓ Granted' : '✗ Denied'}
                </Text>
              </View>
              <View
                style={[
                  styles.permissionIndicator,
                  {
                    backgroundColor: settings.microphonePermission
                      ? '#10B981'
                      : '#EF4444',
                  },
                ]}
              />
            </View>
          </View>
          <Text style={styles.helperText}>
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
            style={styles.dangerButton}
            onPress={handleClearHistory}
          >
            <Text style={styles.dangerButtonText}>Clear Command History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetSettings}
          >
            <Text style={styles.dangerButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </Section>

        <View style={styles.footer} />
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
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
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
  <View style={styles.settingRow}>
    <View style={styles.settingLabel}>
      <Text style={styles.labelText}>{label}</Text>
      {description && (
        <Text style={styles.descriptionText}>{description}</Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#475569', true: '#3B82F6' }}
      thumbColor={value ? '#60A5FA' : '#94A3B8'}
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
  <View style={styles.sliderContainer}>
    <View style={styles.sliderHeader}>
      <Text style={styles.labelText}>{label}</Text>
      {description && (
        <Text style={styles.descriptionText}>{description}</Text>
      )}
    </View>
    <View style={styles.sliderTrack}>
      <View
        style={[
          styles.sliderFill,
          { width: `${value * 100}%` },
        ]}
      />
    </View>
    <View style={styles.sliderLabels}>
      <Text style={styles.sliderLabelEnd}>Low</Text>
      <Text style={styles.sliderLabelEnd}>High</Text>
    </View>
  </View>
);

const VoiceCommandInfo: React.FC = () => (
  <View style={styles.commandsInfo}>
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
  <View style={styles.commandExample}>
    <Text style={styles.commandText}>{command}</Text>
    <Text style={styles.exampleText}>e.g., {example}</Text>
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

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingLabel: {
    flex: 1,
    marginRight: 12,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  languageBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  languageValue: {
    fontSize: 14,
    color: '#94A3B8',
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  languageOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  languageOptionText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  languageOptionTextActive: {
    color: '#FFFFFF',
  },
  sliderContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sliderHeader: {
    marginBottom: 12,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelEnd: {
    fontSize: 11,
    color: '#64748B',
  },
  permissionBox: {
    paddingVertical: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  permissionStatus: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  permissionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  commandsInfo: {
    gap: 8,
  },
  commandExample: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  commandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  dangerButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#7F1D1D',
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  dangerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  footer: {
    height: 20,
  },
});
