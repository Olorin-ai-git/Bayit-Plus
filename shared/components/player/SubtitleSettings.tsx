import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { isTV, isWeb } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export type SubtitleFontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type SubtitleColor = 'white' | 'yellow' | 'cyan' | 'green';
export type SubtitlePosition = 'bottom' | 'top' | 'custom';

export interface SubtitlePreferences {
  fontSize: SubtitleFontSize;
  backgroundColor: string;
  backgroundOpacity: number;
  textColor: SubtitleColor;
  position: SubtitlePosition;
}

export interface SubtitleSettingsProps {
  visible: boolean;
  onClose: () => void;
  currentPreferences: SubtitlePreferences;
  onPreferencesChange: (preferences: SubtitlePreferences) => void;
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
        <Text style={[styles.optionLabel, { textAlign }]}>
          {option.label}
          {isSelected && ' ✓'}
        </Text>
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
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const [fontSize, setFontSize] = useState<SubtitleFontSize>(currentPreferences.fontSize);
  const [opacity, setOpacity] = useState(currentPreferences.backgroundOpacity);
  const [textColor, setTextColor] = useState<SubtitleColor>(currentPreferences.textColor);
  const [position, setPosition] = useState<SubtitlePosition>(currentPreferences.position);

  const handleSave = async () => {
    const preferences: SubtitlePreferences = {
      fontSize,
      backgroundColor: currentPreferences.backgroundColor,
      backgroundOpacity: opacity,
      textColor,
      position,
    };

    // Save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save subtitle preferences:', error);
    }

    onPreferencesChange(preferences);
    onClose();
  };

  const selectedColorHex = COLOR_OPTIONS.find((c) => c.value === textColor)?.hex || '#FFFFFF';
  const selectedFontPx = FONT_SIZE_OPTIONS.find((f) => f.value === fontSize)?.px || 18;

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
                    <Text style={styles.positionLabel}>
                      {option.label}
                      {position === option.value && ' ✓'}
                    </Text>
                    <Text style={styles.positionDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                    {t('player.sampleSubtitle', 'Sample subtitle text')}
                  </Text>
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
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setPreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load subtitle preferences:', error);
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
    width: isTV ? '60%' : '90%',
    maxWidth: 700,
    maxHeight: isTV ? '80%' : '90%',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    padding: isTV ? spacing.xl : spacing.lg,
    // @ts-ignore - Web CSS property
    backdropFilter: 'blur(20px)',
  },
  header: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  title: {
    fontSize: isTV ? 32 : 24,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  sectionTitle: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionTouchable: {
    marginBottom: spacing.xs,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: isTV ? 140 : 100,
  },
  optionSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
  },
  optionFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  optionLabel: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorOptionTouchable: {
    marginBottom: spacing.xs,
  },
  colorOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    minWidth: isTV ? 100 : 80,
  },
  colorSwatch: {
    width: isTV ? 40 : 30,
    height: isTV ? 40 : 30,
    borderRadius: isTV ? 20 : 15,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorLabel: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    fontWeight: '500',
  },
  sliderContainer: {
    paddingVertical: spacing.sm,
  },
  sliderLabel: {
    fontSize: isTV ? 18 : 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sliderTrack: {
    height: isTV ? 8 : 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: isTV ? 4 : 3,
    position: 'relative',
    width: isTV ? 400 : 280,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: isTV ? 4 : 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: isTV ? -6 : -5,
    width: isTV ? 20 : 16,
    height: isTV ? 20 : 16,
    borderRadius: isTV ? 10 : 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.text,
    marginLeft: isTV ? -10 : -8,
  },
  sliderValue: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  positionOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  positionLabel: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  positionDescription: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  previewSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  previewContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: isTV ? 120 : 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSubtitle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  previewText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: isTV ? spacing.md : spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default SubtitleSettings;
