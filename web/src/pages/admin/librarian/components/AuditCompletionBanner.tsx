import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { Icon } from '@olorin/shared-icons/web';
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
        return <Icon name="check" size={16} color={statusColor} style={{ marginRight: 4 }} />;
      case 'failed':
        return <Icon name="x" size={16} color={statusColor} style={{ marginRight: 4 }} />;
      default:
        return <Icon name="alertTriangle" size={16} color={statusColor} style={{ marginRight: 4 }} />;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusColor + '20',
          borderColor: statusColor,
        },
      ]}
    >
      <View style={styles.content}>
        {getStatusIcon()}
        <Text style={[styles.text, { color: statusColor }]}>
          {t(`admin.librarian.status.${report.status}`)}
          {report.execution_time_seconds && ` • ${report.execution_time_seconds.toFixed(1)}s`}
          {report.summary && ` • ${report.summary.total_items || 0} ${t('admin.librarian.itemsChecked', 'items checked')}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
