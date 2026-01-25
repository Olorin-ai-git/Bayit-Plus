/**
 * ContentTypeSelector Component
 * Dropdown selector for content type (movie/series/podcast)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassSelect } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { ContentType } from '../../types';
import { CONTENT_TYPE_OPTIONS } from '../../constants';

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
  disabled?: boolean;
}

export const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const options = CONTENT_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.label),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('admin.uploads.manualUpload.contentType')}</Text>
      <GlassSelect
        value={value}
        onChange={(selected) => onChange(selected as ContentType)}
        options={options}
        disabled={disabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
});
