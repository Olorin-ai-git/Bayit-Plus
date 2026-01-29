/**
 * System Diagnostics Page
 * Real-time monitoring of backend services and client health
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { GlassCard, GlassButton, GlassPageHeader } from '@bayit/shared/ui';
import { GlassRadar, GlassGauge, GlassHeartbeat } from '@olorin/glass-ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useServiceActions } from '@/hooks/useServiceActions';
import type { ClientStatus, ServiceHealth } from '@/services/diagnosticsApi';
import type { RadarAgent, RadarAnomaly } from '@olorin/glass-ui';

/**
 * Transform backend services to radar agents
 */
const transformServicesToAgents = (services: Record<string, ServiceHealth>): RadarAgent[] => {
  const serviceNames = Object.keys(services);
  return serviceNames.map((name, index) => ({
    id: name,
    name: services[name].service_name || name,
    ring: Math.floor((index / serviceNames.length) * 5) + 1, // Distribute across rings 1-5
    position: (index / serviceNames.length) * 2 * Math.PI, // Distribute evenly around circle
    color: services[name].status === 'healthy' ? colors.success.DEFAULT :
           services[name].status === 'degraded' ? colors.warning.DEFAULT :
           colors.error[600],
  }));
};

/**
 * Transform services to radar anomalies
 */
const transformToAnomalies = (services: Record<string, ServiceHealth>): RadarAnomaly[] => {
  return Object.entries(services)
    .filter(([_, service]) => service.status !== 'healthy')
    .map(([name, service], index) => ({
      id: name,
      agent_id: name,
      severity: service.status === 'degraded' ? 'medium' : 'critical',
      type: 'performance',
      description: service.message || `${name} is ${service.status}`,
      timestamp: service.last_check,
      ring: Math.floor((index / Object.keys(services).length) * 5) + 1,
      angle: (index / Object.keys(services).length) * 2 * Math.PI,
    }));
};

/**
 * Calculate BPM from active requests (scaled)
 */
const calculateBPM = (activeRequests: number): number => {
  // Scale active requests to BPM (60-120 range)
  return Math.min(120, Math.max(60, 60 + activeRequests * 2));
};

/**
 * Live indicator component
 */
const LiveIndicator = ({ isLive }: { isLive: boolean }) => (
  <View style={styles.liveIndicator}>
    <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
    <Text style={styles.liveText}>
      {isLive ? 'LIVE' : 'OFFLINE'}
    </Text>
  </View>
);

/**
 * Status banner component
 */
const StatusBanner = ({ services }: { services: Record<string, ServiceHealth> }) => {
  const { t } = useTranslation();
  const servicesList = Object.values(services);
  const healthyCount = servicesList.filter(s => s.status === 'healthy').length;
  const degradedCount = servicesList.filter(s => s.status === 'degraded').length;
  const unhealthyCount = servicesList.filter(s => s.status === 'unhealthy').length;

  const isAllHealthy = healthyCount === servicesList.length;
  const hasCritical = unhealthyCount > 0;

  return (
    <GlassCard style={[
      styles.statusBanner,
      isAllHealthy && styles.statusBannerHealthy,
      hasCritical && styles.statusBannerCritical,
    ]}>
      <View style={styles.statusBannerContent}>
        {isAllHealthy ? (
          <CheckCircle size={24} color={colors.success.DEFAULT} />
        ) : (
          <AlertCircle size={24} color={hasCritical ? colors.error[600] : colors.warning.DEFAULT} />
        )}
        <View style={styles.statusBannerText}>
          <Text style={styles.statusBannerTitle}>
            {isAllHealthy ? t('admin.diagnostics.allSystemsOperational') :
             hasCritical ? t('admin.diagnostics.systemDown') :
             t('admin.diagnostics.systemDegraded')}
          </Text>
          <Text style={styles.statusBannerSubtitle}>
            {healthyCount} healthy • {degradedCount} degraded • {unhealthyCount} down
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

/**
 * Services table component
 */
const ServicesTable = ({
  services,
  onPing
}: {
  services: Record<string, ServiceHealth>;
  onPing: (serviceName: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.servicesTable}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.tableColService]}>Service</Text>
        <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
        <Text style={[styles.tableHeaderText, styles.tableColLatency]}>Latency</Text>
        <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
      </View>
      {Object.entries(services).map(([name, service]) => (
        <View key={name} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableColService]}>{service.service_name || name}</Text>
          <View style={[styles.tableCell, styles.tableColStatus]}>
            <View style={[
              styles.statusBadge,
              service.status === 'healthy' && styles.statusBadgeHealthy,
              service.status === 'degraded' && styles.statusBadgeDegraded,
              service.status === 'unhealthy' && styles.statusBadgeUnhealthy,
            ]}>
              <Text style={styles.statusBadgeText}>
                {t(`admin.diagnostics.${service.status}`)}
              </Text>
            </View>
          </View>
          <Text style={[styles.tableCell, styles.tableColLatency]}>
            {service.latency_ms ? `${service.latency_ms.toFixed(0)}ms` : '-'}
          </Text>
          <View style={[styles.tableCell, styles.tableColActions]}>
            <Pressable
              style={styles.pingButton}
              onPress={() => onPing(name)}
            >
              <Zap size={16} color={colors.primary[500]} />
              <Text style={styles.pingButtonText}>{t('admin.diagnostics.ping')}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function SystemDiagnosticsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const {
    services,
    clients,
    metrics,
    loading,
    error,
    isLive,
    refresh
  } = useSystemHealth();
  const { pingService } = useServiceActions();

  const [selectedAnomaly, setSelectedAnomaly] = useState<RadarAnomaly | null>(null);

  const handleAnomalySelected = (anomaly: RadarAnomaly) => {
    setSelectedAnomaly(anomaly);
    // TODO: Show anomaly details modal
  };

  const handleServicePing = async (serviceName: string) => {
    try {
      await pingService(serviceName);
    } catch (err) {
      console.error('Ping failed:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <GlassPageHeader
          title={t('admin.diagnostics.title')}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading diagnostics...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <GlassPageHeader
          title={t('admin.diagnostics.title')}
        />
        <GlassCard style={styles.errorCard}>
          <AlertCircle size={48} color={colors.error[600]} />
          <Text style={styles.errorText}>{error}</Text>
          <GlassButton
            variant="primary"
            onPress={refresh}
          >
            <RefreshCw size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </GlassButton>
        </GlassCard>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <GlassPageHeader
        title={t('admin.diagnostics.title')}
        rightElement={<LiveIndicator isLive={isLive} />}
      />

      {/* Status Banner */}
      <StatusBanner services={services} />

      {/* Services Radar Visualization */}
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('admin.diagnostics.servicesOverview')}
        </Text>
        <View style={styles.radarContainer}>
          <GlassRadar
            agents={transformServicesToAgents(services)}
            anomalies={transformToAnomalies(services)}
            uiState={{ isScanning: isLive, showLabels: true }}
            size={700}
            onAnomalySelected={handleAnomalySelected}
            testID="services-radar"
          />
        </View>
      </GlassCard>

      {/* Performance Gauges */}
      {metrics && (
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.diagnostics.performanceMetrics')}
          </Text>
          <View style={styles.gaugesRow}>
            <GlassGauge
              value={metrics.cpu_usage}
              max={100}
              label={t('admin.diagnostics.cpu')}
              color={colors.info.DEFAULT}
              testID="cpu-gauge"
            />
            <GlassGauge
              value={metrics.memory_usage}
              max={100}
              label={t('admin.diagnostics.memory')}
              color={colors.warning.DEFAULT}
              testID="memory-gauge"
            />
            <GlassGauge
              value={metrics.disk_usage}
              max={100}
              label={t('admin.diagnostics.disk')}
              color={colors.success.DEFAULT}
              testID="disk-gauge"
            />
          </View>
        </GlassCard>
      )}

      {/* System Activity Heartbeat */}
      {metrics && (
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.diagnostics.systemActivity')}
          </Text>
          <View style={styles.heartbeatContainer}>
            {Object.entries(services).map(([name, service]) => (
              <View key={name} style={styles.heartbeatRow}>
                <Text style={styles.heartbeatLabel}>{service.service_name || name}</Text>
                <GlassHeartbeat
                  status={service.status}
                  serviceName={name}
                  latencyMs={service.latency_ms}
                  size="sm"
                  showPulse={isLive}
                  testID={`heartbeat-${name}`}
                />
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Services Details Table */}
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('admin.diagnostics.servicesDetails')}
        </Text>
        <ServicesTable
          services={services}
          onPing={handleServicePing}
        />
      </GlassCard>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.lg,
  },
  errorCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: colors.error[400],
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[600],
  },
  liveDotActive: {
    backgroundColor: colors.success.DEFAULT,
  },
  liveText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statusBanner: {
    margin: spacing.lg,
    padding: spacing.lg,
  },
  statusBannerHealthy: {
    borderColor: colors.success.DEFAULT,
    borderWidth: 1,
  },
  statusBannerCritical: {
    borderColor: colors.error[600],
    borderWidth: 1,
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  statusBannerSubtitle: {
    color: colors.gray[400],
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  section: {
    margin: spacing.lg,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.lg,
  },
  heartbeatContainer: {
    gap: spacing.md,
  },
  heartbeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white + '20',
  },
  heartbeatLabel: {
    color: colors.white,
    fontSize: fontSize.md,
    flex: 1,
  },
  servicesTable: {
    gap: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white + '10',
  },
  tableCell: {
    color: colors.white,
    fontSize: fontSize.md,
    justifyContent: 'center',
  },
  tableColService: {
    flex: 3,
  },
  tableColStatus: {
    flex: 2,
  },
  tableColLatency: {
    flex: 1,
    textAlign: 'right',
  },
  tableColActions: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusBadgeHealthy: {
    backgroundColor: colors.success.DEFAULT + '30',
  },
  statusBadgeDegraded: {
    backgroundColor: colors.warning.DEFAULT + '30',
  },
  statusBadgeUnhealthy: {
    backgroundColor: colors.error[600] + '30',
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[500] + '20',
  },
  pingButtonText: {
    color: colors.primary[500],
    fontSize: fontSize.sm,
  },
  spacer: {
    height: spacing.xxl,
  },
});
