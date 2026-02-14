/**
 * CreateWidget - Widget creator form
 *
 * Allows selecting widget type, configuring a data source,
 * and customizing widget appearance before saving.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('CreateWidget');

interface WidgetConfig {
  name: string;
  type: string;
  dataSource: string;
  appearance: string;
}

interface CreateWidgetProps {
  onSave: (config: WidgetConfig) => void;
  onCancel: () => void;
}

const WIDGET_TYPES = ['live_channel', 'radio', 'podcast', 'custom'] as const;
const APPEARANCE_OPTIONS = ['compact', 'standard', 'expanded'] as const;

type WidgetType = (typeof WIDGET_TYPES)[number];
type AppearanceOption = (typeof APPEARANCE_OPTIONS)[number];

export const CreateWidget: React.FC<CreateWidgetProps> = ({
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<WidgetType>(WIDGET_TYPES[0]);
  const [dataSource, setDataSource] = useState('');
  const [appearance, setAppearance] = useState<AppearanceOption>('standard');

  const handleSave = useCallback(() => {
    if (!name.trim() || !dataSource.trim()) {
      moduleLogger.warn('Incomplete widget configuration');
      return;
    }
    moduleLogger.info('Saving widget', { name, type: selectedType });
    onSave({ name: name.trim(), type: selectedType, dataSource: dataSource.trim(), appearance });
  }, [name, selectedType, dataSource, appearance, onSave]);

  const isValid = name.trim().length > 0 && dataSource.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { textAlign }]}>{t('widgets.create.title')}</Text>

      <Text style={[styles.label, { textAlign }]}>{t('widgets.create.nameLabel')}</Text>
      <TextInput
        style={[styles.textInput, { textAlign }]}
        value={name}
        onChangeText={setName}
        placeholder={t('widgets.create.namePlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('widgets.create.nameLabel')}
        accessibilityHint={t('widgets.create.nameHint')}
        accessibilityRole="text"
      />

      <Text style={[styles.label, { textAlign }]}>{t('widgets.create.typeLabel')}</Text>
      <View style={styles.optionGrid}>
        {WIDGET_TYPES.map((wt) => (
          <Pressable
            key={wt}
            onPress={() => setSelectedType(wt)}
            style={[styles.optionCard, selectedType === wt && styles.optionCardActive]}
            accessibilityLabel={t(`widgets.types.${wt}`)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedType === wt }}
          >
            <NativeIcon
              name={wt === 'live_channel' ? 'tv' : wt === 'radio' ? 'radio' : wt === 'podcast' ? 'podcast' : 'grid'}
              size="md"
              color={selectedType === wt ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.optionText, selectedType === wt && styles.optionTextActive]}>
              {t(`widgets.types.${wt}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { textAlign }]}>{t('widgets.create.dataSourceLabel')}</Text>
      <TextInput
        style={[styles.textInput, { textAlign }]}
        value={dataSource}
        onChangeText={setDataSource}
        placeholder={t('widgets.create.dataSourcePlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('widgets.create.dataSourceLabel')}
        accessibilityHint={t('widgets.create.dataSourceHint')}
        accessibilityRole="text"
      />

      <Text style={[styles.label, { textAlign }]}>{t('widgets.create.appearanceLabel')}</Text>
      <View style={[styles.appearanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {APPEARANCE_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => setAppearance(opt)}
            style={[styles.appearancePill, appearance === opt && styles.appearancePillActive]}
            accessibilityLabel={t(`widgets.appearance.${opt}`)}
            accessibilityRole="radio"
            accessibilityState={{ selected: appearance === opt }}
          >
            <Text style={[styles.appearanceText, appearance === opt && styles.appearanceTextActive]}>
              {t(`widgets.appearance.${opt}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <GlassButton variant="secondary" onPress={onCancel} style={styles.cancelButton}
          accessibilityLabel={t('common.cancel')} accessibilityRole="button"
        >
          {t('common.cancel')}
        </GlassButton>
        <GlassButton variant="primary" onPress={handleSave} style={styles.saveButton}
          disabled={!isValid} accessibilityLabel={t('common.save')} accessibilityRole="button"
        >
          {t('common.save')}
        </GlassButton>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  textInput: {
    backgroundColor: colors.glassMedium, borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.text,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    flex: 1, minWidth: '45%', padding: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.glassMedium, borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', gap: spacing.xs,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(126,34,206,0.15)' },
  optionText: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'capitalize' },
  optionTextActive: { color: colors.primary, fontWeight: '600' },
  appearanceRow: { gap: spacing.sm },
  appearancePill: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.glassMedium, alignItems: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  appearancePillActive: { borderColor: colors.primary, backgroundColor: 'rgba(126,34,206,0.15)' },
  appearanceText: { fontSize: fontSize.sm, color: colors.textMuted },
  appearanceTextActive: { color: colors.primary, fontWeight: '600' },
  buttonRow: { marginTop: spacing.xl, gap: spacing.sm },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});
