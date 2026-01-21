import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@bayit/shared/theme';
import { AuditReportDetail } from '@/services/librarianService';

interface AuditCompletionBannerProps {
  report: AuditReportDetail;
}

export const AuditCompletionBanner = ({ report }: AuditCompletionBannerProps) => {
  const { t } = useTranslation();

  const getStatusColor = () => {
    switch (report.status) {
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getStatusIcon = () => {
    switch (report.status) {
      case 'completed':
        return '✓ ';
      case 'failed':
        return '✗ ';
      default:
        return '⚠ ';
    }
  };

  const statusColor = getStatusColor();

  return (
    <View
      className="p-4 mb-4 rounded-xl border-2 items-center"
      style={{
        backgroundColor: statusColor + '20',
        borderColor: statusColor,
      }}
    >
      <Text className="text-[15px] font-semibold text-center" style={{ color: statusColor }}>
        {getStatusIcon()}
        {t(`admin.librarian.status.${report.status}`)}
        {report.execution_time_seconds && ` • ${report.execution_time_seconds.toFixed(1)}s`}
        {report.summary && ` • ${report.summary.total_items || 0} items checked`}
      </Text>
    </View>
  );
};
