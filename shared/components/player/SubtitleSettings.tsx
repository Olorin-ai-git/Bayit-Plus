import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { isTV, isWeb } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';
import { logger } from '../../utils/logger';
import {
  HebrewMode,
  isHebrewModePremium,
  getHebrewModeDisplayName,
  getHebrewModeDescription,
} from '../../types/subtitle';

export type SubtitleFontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type SubtitleColor = 'white' | 'yellow' | 'cyan' | 'green';
export type SubtitlePosition = 'bottom' | 'top' | 'custom';

export interface SubtitlePreferences {
  fontSize: SubtitleFontSize;
  backgroundColor: string;
  backgroundOpacity: number;
  textColor: SubtitleColor;
  position: SubtitlePosition;
  hebrewMode?: HebrewMode; // AI subtitle mode for Hebrew content
}

export interface SubtitleSettingsProps {
  visible: boolean;
  onClose: () => void;
  currentPreferences: SubtitlePreferences;
  onPreferencesChange: (preferences: SubtitlePreferences) => void;
  isPremium?: boolean; // Whether user has premium subscription
  contentLanguage?: string; // Language of current content (e.g., 'he' for Hebrew)
}

const FONT_SIZE_OPTIONS: { value: SubtitleFontSize; label: string; px: number }[] = [
  { value: 'small', label: 'Small', px: 14 },
  { value: 'medium', label: 'Medium', px: 18 },
  { value: 'large', label: 'Large', px: 24 },
  { value: 'extra-large', label: 'Extra Large', px: 32 },
];

const COLOR_OPTIONS: { value: SubtitleColor; label: string; hex: string }[] = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'yellow', label: 'Yellow', hex: '#FFFF00' },
  { value: 'cyan', label: 'Cyan', hex: '#00FFFF' },
  { value: 'green', label: 'Green', hex: '#00FF00' },
];

const POSITION_OPTIONS: { value: SubtitlePosition; label: string; description: string }[] = [
  { value: 'bottom', label: 'Bottom', description: 'Bottom of screen' },
  { value: 'top', label: 'Top', description: 'Top of screen' },
  { value: 'custom', label: 'Custom', description: 'Custom position' },
];

const AI_MODE_OPTIONS: Array<{ value: HebrewMode; isPremium: boolean }> = [
  { value: 'regular', isPremium: false },
  { value: 'nikud', isPremium: true },
  { value: 'shoresh', isPremium: true },
  { value: 'heblish', isPremium: true },
  { value: 'grammar_flip', isPremium: true },
  { value: 'slang', isPremium: true },
];

const STORAGE_KEY = 'bayit_subtitle_preferences';

const FontSizeOption: React.FC<{
  option: { value: SubtitleFontSize; label: string; px: number };
  isSelected: boolean;
  onPress: () => void;
}> = ({ option, isSelected, onPress }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      style={styles.optionTouchable}
    >
      <Animated.View
        style={[
          styles.option,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.optionSelected,
          isFocused && styles.optionFocused,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.optionLabel, { textAlign }]}>
            {option.label}
          </Text>
          {isSelected && <NativeIcon name="check" size={isTV ? 18 : 14} color={colors.success.DEFAULT} />}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const ColorOption: React.FC<{
  option: { value: SubtitleColor; label: string; hex: string };
  isSelected: boolean;
  onPress: () => void;
}> = ({ option, isSelected, onPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      style={styles.colorOptionTouchable}
    >
      <Animated.View
        style={[
          styles.colorOption,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.optionSelected,
          isFocused && styles.optionFocused,
        ]}
      >
        <View style={[styles.colorSwatch, { backgroundColor: option.hex }]} />
        <Text style={styles.colorLabel}>{option.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const AIModeOption: React.FC<{
  mode: HebrewMode;
  isSelected: boolean;
  isPremium: boolean;
  userIsPremium: boolean;
  onPress: () => void;
}> = ({ mode, isSelected, isPremium, userIsPremium, onPress }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isLocked = isPremium && !userIsPremium;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={isLocked ? undefined : onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={isLocked ? 1 : 0.7}
      style={styles.aiModeOptionTouchable}
      disabled={isLocked}
    >
      <Animated.View
        style={[
          styles.aiModeOption,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.optionSelected,
          isFocused && styles.optionFocused,
          isLocked && styles.optionLocked,
        ]}
      >
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <Text style={[styles.aiModeLabel, { textAlign }, isLocked && styles.aiModeLabelLocked]}>
              {getHebrewModeDisplayName(mode)}
            </Text>
            {isLocked && <NativeIcon name="lock" size={isTV ? 16 : 12} color="rgba(255,255,255,0.4)" />}
            {isSelected && !isLocked && <NativeIcon name="check" size={isTV ? 18 : 14} color={colors.success.DEFAULT} />}
          </View>
          <Text style={[styles.aiModeDescription, isLocked && styles.aiModeDescriptionLocked]}>
            {getHebrewModeDescription(mode)}
          </Text>
          {isPremium && !isLocked && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const OpacitySlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = isTV ? 400 : 280;
    const newValue = Math.max(0, Math.min(100, Math.round((locationX / sliderWidth) * 100)));
    onChange(newValue);
  };

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>Background Opacity</Text>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={styles.sliderTrack}
      >
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value}%` }]} />
      </TouchableOpacity>
      <Text style={styles.sliderValue}>{value}%</Text>
    </View>
  );
};

export const SubtitleSettings: React.FC<SubtitleSettingsProps> = ({
  visible,
  onClose,
  currentPreferences,
  onPreferencesChange,
  isPremium = false,
  contentLanguage = 'he',
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const [fontSize, setFontSize] = useState<SubtitleFontSize>(currentPreferences.fontSize);
  const [opacity, setOpacity] = useState(currentPreferences.backgroundOpacity);
  const [textColor, setTextColor] = useState<SubtitleColor>(currentPreferences.textColor);
  const [position, setPosition] = useState<SubtitlePosition>(currentPreferences.position);
  const [hebrewMode, setHebrewMode] = useState<HebrewMode>(currentPreferences.hebrewMode || 'regular');

  // Check if AI modes should be shown (only for Hebrew content)
  const showAIModes = contentLanguage === 'he' || contentLanguage === 'iw';

  const handleSave = async () => {
    const preferences: SubtitlePreferences = {
      fontSize,
      backgroundColor: currentPreferences.backgroundColor,
      backgroundOpacity: opacity,
      textColor,
      position,
      hebrewMode,
    };

    // Save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      logger.error('Failed to save subtitle preferences', 'SubtitleSettings', error);
    }

    onPreferencesChange(preferences);
    onClose();
  };

  const selectedColorHex = COLOR_OPTIONS.find((c) => c.value === textColor)?.hex || '#FFFFFF';
  const selectedFontPx = FONT_SIZE_OPTIONS.find((f) => f.value === fontSize)?.px || 18;

  // Sample text based on Hebrew mode
  const getSampleText = (): string => {
    if (!showAIModes) {
      return t('player.sampleSubtitle', 'Sample subtitle text');
    }

    const hebrewSamples: Record<HebrewMode, string> = {
      regular: 'שלום עולם',
      nikud: 'שָׁלוֹם עוֹלָם',
      shoresh: 'שלום [שלם] עולם [עלם]',
      heblish: 'Shalom Olam',
      grammar_flip: 'עולם שלום',
      slang: 'שלום עולם (סלנג: מה קורה)',
    };

    return hebrewSamples[hebrewMode] || hebrewSamples.regular;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={[styles.title, { textAlign }]}>
                {t('player.subtitleSettings', 'Subtitle Settings')}
              </Text>
            </View>

            {/* Font Size Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('player.fontSize', 'Font Size')}
              </Text>
              <View style={styles.optionsContainer}>
                {FONT_SIZE_OPTIONS.map((option) => (
                  <FontSizeOption
                    key={option.value}
                    option={option}
                    isSelected={fontSize === option.value}
                    onPress={() => setFontSize(option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Opacity Section */}
            <View style={styles.section}>
              <OpacitySlider value={opacity} onChange={setOpacity} />
            </View>

            {/* Text Color Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('player.textColor', 'Text Color')}
              </Text>
              <View style={styles.colorOptionsContainer}>
                {COLOR_OPTIONS.map((option) => (
                  <ColorOption
                    key={option.value}
                    option={option}
                    isSelected={textColor === option.value}
                    onPress={() => setTextColor(option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Position Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('player.position', 'Position')}
              </Text>
              <View style={styles.optionsContainer}>
                {POSITION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setPosition(option.value)}
                    style={[
                      styles.positionOption,
                      position === option.value && styles.optionSelected,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.positionLabel}>
                        {option.label}
                      </Text>
                      {position === option.value && <NativeIcon name="check" size={isTV ? 18 : 14} color={colors.success.DEFAULT} />}
                    </View>
                    <Text style={styles.positionDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* AI Subtitle Modes Section (Hebrew content only) */}
            {showAIModes && (
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
                  <Text style={[styles.sectionTitle, { textAlign }]}>
                    {t('player.aiSubtitleModes', 'AI Subtitle Modes')}
                  </Text>
                  <View style={styles.aiModeBadge}>
                    <NativeIcon name="sparkles" size={isTV ? 14 : 12} color="#a855f7" />
                    <Text style={styles.aiModeBadgeText}>AI</Text>
                  </View>
                </View>
                <Text style={[styles.sectionDescription, { textAlign }]}>
                  {t('player.aiModesDescription', 'Enhanced Hebrew subtitle display modes powered by AI')}
                </Text>
                <View style={styles.aiModesContainer}>
                  {AI_MODE_OPTIONS.map((option) => (
                    <AIModeOption
                      key={option.value}
                      mode={option.value}
                      isSelected={hebrewMode === option.value}
                      isPremium={option.isPremium}
                      userIsPremium={isPremium}
                      onPress={() => setHebrewMode(option.value)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Live Preview */}
            <View style={styles.previewSection}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('player.preview', 'Preview')}
              </Text>
              <View style={styles.previewContainer}>
                <View
                  style={[
                    styles.previewSubtitle,
                    {
                      backgroundColor: `rgba(0, 0, 0, ${opacity / 100})`,
                      alignSelf: position === 'top' ? 'flex-start' : position === 'bottom' ? 'flex-end' : 'center',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.previewText,
                      {
                        color: selectedColorHex,
                        fontSize: selectedFontPx,
                      },
                    ]}
                  >
                    {getSampleText()}
                  </Text>
                  {showAIModes && (
                    <Text style={styles.previewModeLabel}>
                      {getHebrewModeDisplayName(hebrewMode)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>
                  {t('common.save', 'Save')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Hook to get saved subtitle preferences
 */
export const useSubtitlePreferences = (): SubtitlePreferences => {
  const [preferences, setPreferences] = useState<SubtitlePreferences>({
    fontSize: 'medium',
    backgroundColor: '#000000',
    backgroundOpacity: 80,
    textColor: 'white',
    position: 'bottom',
    hebrewMode: 'regular',
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setPreferences(JSON.parse(saved));
        }
      } catch (error) {
        logger.error('Failed to load subtitle preferences', 'SubtitleSettings', error);
      }
    };

    loadPreferences();
  }, []);

  return preferences;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: isTV ? '50%' : '90%',
    maxWidth: 600,
    maxHeight: isTV ? '80%' : '90%',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    padding: isTV ? spacing.xl : spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  title: {
    fontSize: isTV ? 32 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  sectionTitle: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionTouchable: {
    marginBottom: spacing.sm,
  },
  option: {
    padding: isTV ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  optionFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  optionLabel: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOptionTouchable: {
    flex: 1,
    minWidth: 80,
  },
  colorOption: {
    padding: isTV ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorSwatch: {
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: isTV ? 20 : 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorLabel: {
    fontSize: isTV ? 14 : 12,
    color: '#fff',
  },
  sliderContainer: {
    gap: spacing.sm,
  },
  sliderLabel: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  sliderTrack: {
    height: isTV ? 8 : 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: isTV ? 4 : 3,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: isTV ? 4 : 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: isTV ? -6 : -4,
    width: isTV ? 20 : 14,
    height: isTV ? 20 : 14,
    backgroundColor: '#fff',
    borderRadius: isTV ? 10 : 7,
    marginLeft: isTV ? -10 : -7,
  },
  sliderValue: {
    fontSize: isTV ? 14 : 12,
    color: '#fff',
    textAlign: 'center',
  },
  positionOption: {
    padding: isTV ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  positionLabel: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  positionDescription: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
  previewSection: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  previewContainer: {
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    padding: spacing.md,
  },
  previewSubtitle: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
  },
  previewText: {
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: isTV ? spacing.md : spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: isTV ? spacing.md : spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  // AI Modes styles
  sectionDescription: {
    fontSize: isTV ? 14 : 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.sm,
  },
  aiModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiModeBadgeText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '700',
    color: '#a855f7',
    letterSpacing: 0.5,
  },
  aiModesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiModeOptionTouchable: {
    width: isTV ? '31%' : '48%',
    marginBottom: spacing.sm,
  },
  aiModeOption: {
    padding: isTV ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: isTV ? 100 : 80,
  },
  optionLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    opacity: 0.6,
  },
  aiModeLabel: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiModeLabelLocked: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  aiModeDescription: {
    fontSize: isTV ? 13 : 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
  aiModeDescriptionLocked: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  premiumBadgeText: {
    fontSize: isTV ? 10 : 8,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  previewModeLabel: {
    fontSize: isTV ? 12 : 10,
    color: 'rgba(168, 85, 247, 0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});

export default SubtitleSettings;
