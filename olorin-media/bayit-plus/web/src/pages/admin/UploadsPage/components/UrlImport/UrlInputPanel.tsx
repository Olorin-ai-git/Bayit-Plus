/**
 * UrlInputPanel Component
 * URL entry, validation, and import interface
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassInput, GlassButton } from '@bayit/shared/ui';
import { Link, Upload } from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { useUrlImport } from '../../hooks/useUrlImport';
import { ContentTypeSelector } from '../ManualUpload/ContentTypeSelector';
import type { ContentType } from '../../types';

export const UrlInputPanel: React.FC = () => {
  const { t } = useTranslation();
  const [contentType, setContentType] = useState<ContentType>('movie');

  const { urls, setUrls, validateUrls, uploadFromUrls, validating, uploading, parseUrls } =
    useUrlImport();

  const handleValidate = async () => {
    const urlList = parseUrls(urls);
    if (urlList.length > 0) {
      await validateUrls(urlList);
    }
  };

  const handleUpload = async () => {
    const urlList = parseUrls(urls);
    if (urlList.length > 0) {
      await uploadFromUrls(urlList, contentType);
    }
  };

  return (
    <View style={styles.container}>
      <ContentTypeSelector value={contentType} onChange={setContentType} disabled={uploading} />

      <View style={styles.inputSection}>
        <Text style={styles.label}>{t('admin.uploads.urlUpload.title')}</Text>
        <GlassInput
          value={urls}
          onChangeText={setUrls}
          placeholder={t('admin.uploads.urlUpload.placeholder')}
          multiline
          numberOfLines={5}
          disabled={uploading}
        />
        <Text style={styles.hint}>
          {t('admin.uploads.urlUpload.hint', { defaultValue: 'Enter one URL per line' })}
        </Text>
      </View>

      <View style={styles.actions}>
        <GlassButton
          title={t('admin.uploads.urlUpload.validate')}
          onPress={handleValidate}
          variant="secondary"
          disabled={!urls.trim() || uploading}
          loading={validating}
          icon={<Link size={18} />}
          iconPosition="left"
        />

        <GlassButton
          title={t('admin.uploads.urlUpload.upload')}
          onPress={handleUpload}
          variant="primary"
          disabled={!urls.trim() || uploading}
          loading={uploading}
          icon={<Upload size={18} />}
          iconPosition="left"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  inputSection: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
});
