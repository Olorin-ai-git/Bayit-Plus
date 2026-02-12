import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens';

interface SubtitleModePickerProps {
  visible: boolean;
  currentMode: string;
  language: string;
  onModeChange: (mode: string) => void;
  onClose: () => void;
}

interface SubtitleMode {
  id: string;
  name: string;
  description: string;
}

const hebrewModes: SubtitleMode[] = [
  {
    id: 'regular',
    name: 'Regular',
    description: 'Standard Hebrew subtitles without vowel marks'
  },
  {
    id: 'nikud',
    name: 'Nikud',
    description: 'Hebrew with vowel marks for easier reading'
  },
  {
    id: 'shoresh',
    name: 'Shoresh',
    description: 'Root-based learning with word origins highlighted'
  },
  {
    id: 'engrew',
    name: 'Engrew',
    description: 'English transliteration with Hebrew context'
  }
];

const englishModes: SubtitleMode[] = [
  {
    id: 'regular',
    name: 'Regular',
    description: 'Standard English subtitles'
  },
  {
    id: 'heblish',
    name: 'Heblish',
    description: 'English with Hebrew terms and cultural context'
  },
  {
    id: 'grammarFlip',
    name: 'Grammar Flip',
    description: 'Hebrew sentence structure with English words'
  },
  {
    id: 'slangSynthesis',
    name: 'Slang Synthesis',
    description: 'Cultural slang and idioms explained'
  }
];

export const SubtitleModePicker: React.FC<SubtitleModePickerProps> = ({
  visible,
  currentMode,
  language,
  onModeChange,
  onClose
}) => {
  if (!visible) {
    return null;
  }

  const modes = language === 'he' || language === 'iw' ? hebrewModes : englishModes;

  const handleModeSelect = (modeId: string) => {
    onModeChange(modeId);
    onClose();
  };

  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Subtitle Mode</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView}>
          {modes.map((mode) => {
            const isSelected = currentMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                style={[styles.modeRow, isSelected && styles.selectedRow]}
                onPress={() => handleModeSelect(mode.id)}
              >
                <View style={styles.modeContent}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={styles.modeTextContainer}>
                    <Text style={[styles.modeName, isSelected && styles.selectedText]}>
                      {mode.name}
                    </Text>
                    <Text style={styles.modeDescription}>{mode.description}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: glass.overlay.dark,
    zIndex: 999
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: glass.surface.dark,
    backdropFilter: glass.blur.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.neutral[700],
    zIndex: 1000
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[700]
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[50]
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm
  },
  closeText: {
    fontSize: fontSize['2xl'],
    color: colors.neutral[400],
    lineHeight: fontSize['2xl']
  },
  scrollView: {
    maxHeight: 480
  },
  modeRow: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800]
  },
  selectedRow: {
    backgroundColor: glass.overlay.light
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  radioContainer: {
    paddingTop: spacing.xxs,
    marginRight: spacing.md
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[500],
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioSelected: {
    borderColor: colors.primary[400]
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[400]
  },
  modeTextContainer: {
    flex: 1
  },
  modeName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[200],
    marginBottom: spacing.xs
  },
  selectedText: {
    color: colors.primary[300]
  },
  modeDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
    lineHeight: fontSize.md
  }
});
