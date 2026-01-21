import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
    <View style={[
      styles.completionBanner,
      {
        backgroundColor: statusColor + '20',
        borderColor: statusColor,
      }
    ]}>
      <Text style={[styles.completionText, { color: statusColor }]}>
        {getStatusIcon()}
        {t(`admin.librarian.status.${report.status}`)}
        {report.execution_time_seconds && ` • ${report.execution_time_seconds.toFixed(1)}s`}
        {report.summary && ` • ${report.summary.total_items || 0} items checked`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  completionBanner: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
