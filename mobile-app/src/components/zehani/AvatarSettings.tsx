/**
 * AvatarSettings - Avatar customization settings panel.
 *
 * Editable name, voice selection, and personality trait toggles.
 * Persists changes via the zeh-ani backend API.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const settingsLogger = logger.scope('AvatarSettings');

interface AvatarSettingsData {
  name: string;
  voiceId: string;
  personalityTraits: string[];
}

interface AvatarSettingsProps {
  avatarId: string;
  settings: AvatarSettingsData;
  onSave: (updated: AvatarSettingsData) => void;
}

const VOICE_OPTIONS = [
  { id: 'warm_male', labelKey: 'zehAni.settings.voices.warmMale' },
  { id: 'warm_female', labelKey: 'zehAni.settings.voices.warmFemale' },
  { id: 'energetic_male', labelKey: 'zehAni.settings.voices.energeticMale' },
  { id: 'energetic_female', labelKey: 'zehAni.settings.voices.energeticFemale' },
] as const;

const PERSONALITY_TRAITS = [
  'friendly', 'curious', 'patient', 'humorous', 'encouraging', 'scholarly',
] as const;

export const AvatarSettings: React.FC<AvatarSettingsProps> = ({
  avatarId,
  settings,
  onSave,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(settings.name);
  const [voiceId, setVoiceId] = useState(settings.voiceId);
  const [traits, setTraits] = useState<string[]>(settings.personalityTraits);
  const [saving, setSaving] = useState(false);

  const toggleTrait = useCallback((trait: string) => {
    setTraits((prev) =>
      prev.includes(trait) ? prev.filter((tr) => tr !== trait) : [...prev, trait],
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const updated: AvatarSettingsData = { name, voiceId, personalityTraits: traits };
    settingsLogger.info('Saving avatar settings', { avatarId });
    onSave(updated);
    setSaving(false);
  }, [name, voiceId, traits, avatarId, onSave]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('zehAni.settings.nameLabel')}
      </Text>
      <TextInput style={styles.input} value={name} onChangeText={setName}
        placeholder={t('zehAni.settings.namePlaceholder')}
        placeholderTextColor={Colors.Text.disabled}
        accessibilityLabel={t('zehAni.settings.nameLabel')}
        accessibilityHint={t('zehAni.settings.nameHint')}
        accessibilityRole="none" />

      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('zehAni.settings.voiceLabel')}
      </Text>
      <View style={styles.optionsRow}>
        {VOICE_OPTIONS.map((voice) => (
          <Pressable key={voice.id}
            style={[styles.chip, voiceId === voice.id && styles.chipSelected]}
            onPress={() => setVoiceId(voice.id)}
            accessibilityLabel={t(voice.labelKey)}
            accessibilityHint={t('zehAni.settings.selectVoiceHint')}
            accessibilityRole="radio"
            accessibilityState={{ selected: voiceId === voice.id }}>
            <Text style={[styles.chipText, voiceId === voice.id && styles.chipTextSelected]}>
              {t(voice.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('zehAni.settings.personalityLabel')}
      </Text>
      <View style={styles.optionsRow}>
        {PERSONALITY_TRAITS.map((trait) => {
          const isActive = traits.includes(trait);
          return (
            <Pressable key={trait}
              style={[styles.chip, isActive && styles.chipSelected]}
              onPress={() => toggleTrait(trait)}
              accessibilityLabel={t(`zehAni.settings.traits.${trait}`)}
              accessibilityHint={t('zehAni.settings.toggleTraitHint')}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isActive }}>
              <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>
                {t(`zehAni.settings.traits.${trait}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GlassButton title={saving ? t('common.saving') : t('common.save')}
        onPress={handleSave} variant="primary" disabled={saving || !name.trim()}
        accessibilityLabel={t('common.save')}
        accessibilityHint={t('zehAni.settings.saveHint')}
        accessibilityRole="button" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  scrollContent: { padding: 20, gap: 8 },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', color: Colors.Text.primary, marginTop: 16, marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 12, padding: 14,
    color: Colors.Text.primary, fontSize: 16,
    borderWidth: 1, borderColor: Colors.Glass.whiteMedium,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
  chipSelected: {
    backgroundColor: Colors.Primary.p900, borderColor: Colors.Primary.p500,
  },
  chipText: { fontSize: 14, color: Colors.Text.secondary },
  chipTextSelected: { color: Colors.Text.primary, fontWeight: '600' },
});
