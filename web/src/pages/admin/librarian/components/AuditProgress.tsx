import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@bayit/shared/theme';
import { BatchProgress } from '../types';

interface AuditProgressProps {
  progress: BatchProgress;
  isRTL: boolean;
}

export const AuditProgress = ({ progress, isRTL }: AuditProgressProps) => {
  const { t } = useTranslation();

  return (
    <View className="p-4 mb-4 bg-purple-500/10 rounded-xl border" style={{ borderColor: colors.glassBorder }}>
      <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center mb-1`}>
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          {progress.percentage >= 99 ? (
            t('admin.librarian.progress.finishing', 'Finishing up...')
          ) : (
            t('admin.librarian.progress.batch', 'Batch {{current}} of {{total}}', {
              current: progress.currentBatch,
              total: progress.totalBatches
            })
          )}
        </Text>
        <Text className="text-base font-bold" style={{ color: colors.primary }}>
          {progress.percentage}%
        </Text>
      </View>
      <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
        {t('admin.librarian.progress.items', '{{processed}} of {{total}} items', {
          processed: progress.itemsProcessed,
          total: progress.totalItems
        })}
        {progress.percentage >= 99 && (
          <Text className="italic" style={{ color: colors.textMuted }}>
            {' • '}{t('admin.librarian.progress.finalizing', 'Generating report and applying fixes')}
          </Text>
        )}
      </Text>
      <View className="h-2 bg-white/20 rounded-lg overflow-hidden border" style={{ borderColor: colors.glassBorder }}>
        <View className="h-full rounded-lg transition-all duration-300" style={{ width: `${progress.percentage}%`, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
};
