/**
 * Anomaly Details Modal
 * Shows detailed information about a service anomaly detected on the radar
 */
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, MapPin } from 'lucide-react';
import { GlassModal, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import type { RadarAnomaly } from '@olorin/glass-ui';
import type { ServiceHealth } from '@/services/diagnosticsApi';

interface AnomalyDetailsModalProps {
  anomaly: RadarAnomaly | null;
  service: ServiceHealth | undefined;
  visible: boolean;
  onClose: () => void;
  onPing: (serviceName: string) => void;
}

const getSeverityColor = (severity?: string): string => {
  switch (severity) {
    case 'critical': return colors.error[600];
    case 'high': return colors.error[400];
    case 'medium': return colors.warning.DEFAULT;
    case 'low': return colors.info.DEFAULT;
    default: return colors.warning.DEFAULT;
  }
};

export default function AnomalyDetailsModal({
  anomaly, service, visible, onClose, onPing,
}: AnomalyDetailsModalProps) {
  const { t } = useTranslation();
  if (!anomaly) return null;

  const severityColor = getSeverityColor(anomaly.severity);

  return (
    <GlassModal
      visible={visible}
      title={t('admin.diagnostics.anomalyDetails')}
      onClose={onClose}
      dismissable
    >
      <View style={styles.headerRow}>
        <AlertCircle size={24} color={severityColor} />
        <View style={styles.headerText}>
          <Text style={styles.anomalyName}>{anomaly.name}</Text>
          <View style={[styles.severityBadge, { backgroundColor: severityColor + '30' }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {t(`admin.diagnostics.severity.${anomaly.severity || 'medium'}`)}
            </Text>
          </View>
        </View>
      </View>

      {service && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('admin.diagnostics.serviceStatus')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('admin.diagnostics.status')}</Text>
            <Text style={[styles.value, { color: severityColor }]}>
              {t(`admin.diagnostics.${service.status}`)}
            </Text>
          </View>
          {service.latency_ms != null && (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Clock size={14} color={colors.white + '70'} />
                <Text style={styles.label}>{t('admin.diagnostics.latency')}</Text>
              </View>
              <Text style={styles.value}>{service.latency_ms.toFixed(0)}ms</Text>
            </View>
          )}
          {!!service.message && (
            <View style={styles.msgBox}>
              <Text style={styles.msgLabel}>{t('admin.diagnostics.message')}</Text>
              <Text style={styles.msgText}>{service.message}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('admin.diagnostics.radarPosition')}</Text>
        <View style={styles.row}>
          <View style={styles.labelRow}>
            <MapPin size={14} color={colors.white + '70'} />
            <Text style={styles.label}>{t('admin.diagnostics.coordinates')}</Text>
          </View>
          <Text style={styles.value}>
            ({anomaly.position.x.toFixed(0)}, {anomaly.position.y.toFixed(0)})
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <GlassButton variant="secondary" onPress={onClose}>
          <Text style={styles.btnText}>{t('common.close')}</Text>
        </GlassButton>
        <GlassButton variant="primary" onPress={() => { onPing(anomaly.id); onClose(); }}>
          <Text style={styles.btnText}>{t('admin.diagnostics.recheckService')}</Text>
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerText: { flex: 1, gap: spacing.xs },
  anomalyName: { color: colors.white, fontSize: fontSize.xl, fontWeight: 'bold' },
  severityBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start',
  },
  severityText: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'uppercase' },
  section: {
    marginBottom: spacing.lg, padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.md,
  },
  sectionLabel: { color: colors.white, fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.md },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: 'rgba(255, 255, 255, 0.7)', fontSize: fontSize.md },
  value: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  msgBox: { marginTop: spacing.md },
  msgLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: fontSize.sm, marginBottom: spacing.xs },
  msgText: { color: colors.warning.DEFAULT, fontSize: fontSize.md, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end', marginTop: spacing.md },
  btnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});
