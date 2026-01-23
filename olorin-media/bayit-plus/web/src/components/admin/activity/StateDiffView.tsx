import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@bayit/shared/theme';
import { platformClass } from '../../../utils/platformClass';

interface StateDiff {
  key: string;
  before: any;
  after: any;
}

interface StateDiffViewProps {
  diffs: StateDiff[];
  textAlign: 'left' | 'right';
}

/**
 * StateDiffView - Displays before/after state changes
 *
 * Renders a list of field changes showing old values (strikethrough)
 * and new values with color coding.
 */
export const StateDiffView: React.FC<StateDiffViewProps> = ({ diffs, textAlign }) => {
  const { t } = useTranslation();

  if (diffs.length === 0) return null;

  return (
    <View
      className={platformClass('mt-2 p-2 rounded-sm border-l-2')}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderLeftColor: colors.primary }}
    >
      <Text className={platformClass('text-xs font-semibold mb-1')} style={{ textAlign, color: colors.textSecondary }}>
        {t('admin.librarian.activityLog.changes')}:
      </Text>
      {diffs.map((diff, idx) => (
        <View key={idx} className={platformClass('mb-1')}>
          <Text className={platformClass('text-[11px] font-semibold mb-0.5')} style={{ color: colors.primary }}>
            {diff.key}:
          </Text>
          <View className={platformClass('flex-row gap-1 items-center flex-wrap')}>
            <Text className={platformClass('text-[11px] font-mono line-through')} style={{ color: colors.error }}>
              {typeof diff.before === 'object' ? JSON.stringify(diff.before) : String(diff.before || 'null')}
            </Text>
            <Text className={platformClass('text-[11px]')} style={{ color: colors.textMuted }}>→</Text>
            <Text className={platformClass('text-[11px] font-mono')} style={{ color: colors.success }}>
              {typeof diff.after === 'object' ? JSON.stringify(diff.after) : String(diff.after || 'null')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default StateDiffView;
