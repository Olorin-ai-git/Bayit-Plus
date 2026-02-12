import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Palette, Wand2, ArrowLeft } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

interface AvatarStylePickerProps {
  onStyleSelected: (style: 'cartoon_2d' | 'pixar_3d') => void;
  onBack: () => void;
}

const STYLE_OPTIONS = [
  {
    key: 'cartoon_2d' as const,
    label: 'Cartoon 2D',
    description: 'Colorful hand-drawn illustration style with bold outlines',
    Icon: Palette,
  },
  {
    key: 'pixar_3d' as const,
    label: 'Pixar 3D',
    description: 'Detailed 3D-rendered character with expressive features',
    Icon: Wand2,
  },
];

export function AvatarStylePicker({ onStyleSelected, onBack }: AvatarStylePickerProps) {
  const [selected, setSelected] = useState<'cartoon_2d' | 'pixar_3d' | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Avatar Style</Text>
      <Text style={styles.subtitle}>Select the visual style for your character</Text>

      <View style={styles.optionsRow}>
        {STYLE_OPTIONS.map(({ key, label, description, Icon }) => (
          <Pressable
            key={key}
            style={[styles.optionCard, selected === key && styles.optionCardSelected]}
            onPress={() => setSelected(key)}
          >
            <View style={[styles.iconContainer, selected === key && styles.iconContainerSelected]}>
              <Icon size={32} color={selected === key ? colors.white : colors.primary[400]} />
            </View>
            <Text style={styles.optionLabel}>{label}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
            {selected === key && <View style={styles.selectedIndicator} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={18} color={colors.textSecondary} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.generateButton, !selected && styles.buttonDisabled]}
          onPress={() => selected && onStyleSelected(selected)}
        >
          <Wand2 size={18} color={colors.white} />
          <Text style={styles.generateButtonText}>Generate Avatar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[4], width: '100%' },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  optionsRow: { flexDirection: 'row', gap: spacing[4], width: '100%' },
  optionCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.glass.border, padding: spacing[4], gap: spacing[3],
  },
  optionCardSelected: { borderColor: colors.primary[400], backgroundColor: colors.glass.purpleLight },
  iconContainer: {
    width: 64, height: 64, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgLight,
    justifyContent: 'center', alignItems: 'center',
  },
  iconContainerSelected: { backgroundColor: colors.primary[600] },
  optionLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  optionDescription: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  selectedIndicator: {
    width: 12, height: 12, borderRadius: borderRadius.full, backgroundColor: colors.primary[400],
  },
  buttonRow: { flexDirection: 'row', gap: spacing[3], width: '100%', marginTop: spacing[2] },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.glass.bgMedium,
    borderRadius: borderRadius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderWidth: 1, borderColor: colors.glass.border,
  },
  backButtonText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  generateButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    backgroundColor: colors.primary[600], borderRadius: borderRadius.md, padding: spacing[3],
  },
  generateButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  buttonDisabled: { opacity: 0.5 },
});
