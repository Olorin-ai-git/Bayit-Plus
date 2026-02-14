/**
 * SplitSubtitleLanguagePicker - Dual language selector
 *
 * Side-by-side dropdowns for primary and secondary subtitle languages
 * used in split/bilingual subtitle mode.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import type { AvailableLanguage } from '../../../hooks/useSubtitleMode';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('SplitSubtitleLanguagePicker');

interface SplitSubtitleLanguagePickerProps {
  languages: AvailableLanguage[];
  primary: string;
  secondary: string;
  onPrimaryChange: (lang: string) => void;
  onSecondaryChange: (lang: string) => void;
}

interface LanguageColumnProps {
  label: string;
  languages: AvailableLanguage[];
  selected: string;
  onSelect: (lang: string) => void;
  columnId: string;
}

const LanguageColumn: React.FC<LanguageColumnProps> = ({
  label,
  languages,
  selected,
  onSelect,
  columnId,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <ScrollView
        style={styles.languageList}
        showsVerticalScrollIndicator={false}
      >
        {languages.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <Pressable
              key={`${columnId}-${lang.code}`}
              style={[styles.langItem, isSelected && styles.langItemSelected]}
              onPress={() => onSelect(lang.code)}
              accessibilityLabel={lang.name}
              accessibilityHint={t('subtitles.splitPicker.selectHint', {
                language: lang.name,
              })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.langName,
                  isSelected && styles.langNameSelected,
                ]}
              >
                {lang.nativeName}
              </Text>
              <Text style={styles.langCode}>{lang.code.toUpperCase()}</Text>
              {isSelected && (
                <NativeIcon
                  name="check"
                  size="xs"
                  color={Colors.Primary.p400}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const SplitSubtitleLanguagePicker: React.FC<
  SplitSubtitleLanguagePickerProps
> = ({ languages, primary, secondary, onPrimaryChange, onSecondaryChange }) => {
  const { t } = useTranslation();

  const handlePrimaryChange = useCallback(
    (lang: string) => {
      onPrimaryChange(lang);
      log.info('Primary subtitle language changed', { lang });
    },
    [onPrimaryChange],
  );

  const handleSecondaryChange = useCallback(
    (lang: string) => {
      onSecondaryChange(lang);
      log.info('Secondary subtitle language changed', { lang });
    },
    [onSecondaryChange],
  );

  return (
    <GlassView intensity="medium" style={styles.container}>
      <Text style={styles.title}>{t('subtitles.splitPicker.title')}</Text>
      <View style={styles.columnsRow}>
        <LanguageColumn
          label={t('subtitles.splitPicker.primary')}
          languages={languages}
          selected={primary}
          onSelect={handlePrimaryChange}
          columnId="primary"
        />
        <View style={styles.divider} />
        <LanguageColumn
          label={t('subtitles.splitPicker.secondary')}
          languages={languages}
          selected={secondary}
          onSelect={handleSecondaryChange}
          columnId="secondary"
        />
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  columnsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Primary.p400,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  languageList: {
    maxHeight: 200,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  langItemSelected: {
    backgroundColor: Colors.Glass.purpleLight,
  },
  langName: {
    flex: 1,
    fontSize: 14,
    color: Colors.Text.primary,
  },
  langNameSelected: {
    fontWeight: '600',
    color: Colors.Primary.p400,
  },
  langCode: {
    fontSize: 11,
    color: Colors.Text.muted,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    backgroundColor: Colors.Glass.borderLight,
  },
});
