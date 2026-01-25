/**
 * UploadStageIndicator Component
 * Visual 6-stage pipeline indicator with icons and animations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import type { UploadStageState } from '../../types';
import { UPLOAD_STAGE_ICONS } from '../../constants';
import { useTranslation } from 'react-i18next';

interface UploadStageIndicatorProps {
  stages: UploadStageState;
  compact?: boolean;
}

const STAGE_ORDER: (keyof UploadStageState)[] = [
  'browserUpload',
  'hashCalculation',
  'duplicateCheck',
  'metadataExtraction',
  'gcsUpload',
  'databaseInsert',
];

export const UploadStageIndicator: React.FC<UploadStageIndicatorProps> = ({
  stages,
  compact = false,
}) => {
  const { t } = useTranslation();

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.primary.DEFAULT;
      case 'failed':
        return colors.error;
      default:
        return colors.glass.borderLight;
    }
  };

  const renderStageIcon = (stageKey: keyof UploadStageState) => {
    const status = stages[stageKey];
    const color = getStageColor(status);

    if (status === 'completed') {
      return <CheckCircle size={compact ? 16 : 20} color={color} />;
    }
    if (status === 'failed') {
      return <XCircle size={compact ? 16 : 20} color={color} />;
    }
    if (status === 'in_progress') {
      return <Loader size={compact ? 16 : 20} color={color} className="animate-spin" />;
    }

    // Pending - show stage emoji
    const stageIconKey = stageKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    const icon = UPLOAD_STAGE_ICONS[stageIconKey] || '⭘';
    return <Text style={[styles.emoji, { opacity: 0.4 }]}>{icon}</Text>;
  };

  return (
    <View style={styles.container}>
      {STAGE_ORDER.map((stageKey, index) => {
        const status = stages[stageKey];
        const color = getStageColor(status);

        return (
          <View key={stageKey} style={styles.stageWrapper}>
            <View style={styles.stageContent}>
              <View style={[styles.iconCircle, { borderColor: color }]}>
                {renderStageIcon(stageKey)}
              </View>
              {!compact && (
                <Text style={[styles.stageLabel, { color }]}>
                  {t(`admin.uploads.stages.${stageKey}`)}
                </Text>
              )}
            </View>

            {index < STAGE_ORDER.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      status === 'completed' ? colors.success : colors.glass.borderLight,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emoji: {
    fontSize: fontSize.md,
  },
  stageLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    maxWidth: 80,
    textAlign: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
  },
});
