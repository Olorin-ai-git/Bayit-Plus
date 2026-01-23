import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import logger from '@/utils/logger';

interface APIKeyStatus {
  configured: boolean;
  masked_key: string;
}

export default function VoiceSettingsPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<any>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<any>({});

  const loadAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await voiceManagementService.getAPIKeysStatus();
      setApiKeys(response.api_keys);
    } catch (error: any) {
      logger.error('Failed to load API keys', 'VoiceSettingsPanel', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const handleHealthCheck = async (provider: string) => {
    setChecking(provider);
    try {
      const response = await voiceManagementService.runHealthCheck(provider);
      setHealthResults((prev: any) => ({
        ...prev,
        [provider]: response.results[provider],
      }));
    } catch (error: any) {
      logger.error('Health check failed', 'VoiceSettingsPanel', error);
    } finally {
      setChecking(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderProviderCard = (provider: string, config: APIKeyStatus) => {
    const health = healthResults[provider];

    return (
      <GlassCard key={provider} style={styles.card}>
        <View style={styles.providerHeader}>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.toUpperCase()}</Text>
            <Text style={styles.keyStatus}>
              {config.configured ? (
                <CheckCircle size={14} color={colors.success} />
              ) : (
                <XCircle size={14} color={colors.error} />
              )}{' '}
              {config.masked_key}
            </Text>
          </View>
          <GlassButton
            title="Check"
            icon={<RefreshCw size={14} color={colors.primary} />}
            variant="secondary"
            onPress={() => handleHealthCheck(provider)}
            loading={checking === provider}
            style={styles.checkButton}
          />
        </View>

        {health && (
          <View style={styles.healthInfo}>
            <Text
              style={[
                styles.healthStatus,
                { color: health.is_healthy ? colors.success : colors.error },
              ]}
            >
              {health.is_healthy ? 'Healthy' : 'Unhealthy'}
            </Text>
            {health.latency_ms && (
              <Text style={styles.healthLatency}>
                {health.latency_ms.toFixed(0)}ms
              </Text>
            )}
            {health.error_message && (
              <Text style={styles.healthError}>{health.error_message}</Text>
            )}
          </View>
        )}
      </GlassCard>
    );
  };

  return (
    <View>
      <Text style={styles.title}>{t('admin.voiceManagement.settings.apiKeys')}</Text>

      {apiKeys &&
        Object.entries(apiKeys).map(([provider, config]) =>
          renderProviderCard(provider, config as APIKeyStatus)
        )}

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t('admin.voiceManagement.settings.webhooks')}</Text>
        <Text style={styles.infoText}>
          {t('admin.voiceManagement.settings.webhookInfo')}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  keyStatus: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  checkButton: {
    minWidth: 80,
  },
  healthInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  healthStatus: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  healthLatency: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  healthError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
