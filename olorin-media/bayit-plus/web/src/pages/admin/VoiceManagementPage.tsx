import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic2, Library, BarChart3, Settings, DollarSign, Shield } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';

import VoiceConfigurationPanel from './components/VoiceConfigurationPanel';
import VoiceLibraryPanel from './components/VoiceLibraryPanel';
import VoiceAnalyticsPanel from './components/VoiceAnalyticsPanel';
import QuotaManagementPanel from './components/QuotaManagementPanel';
import VoiceSettingsPanel from './components/VoiceSettingsPanel';

type TabType = 'configuration' | 'library' | 'analytics' | 'quotas' | 'settings';

export default function VoiceManagementPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [activeTab, setActiveTab] = useState<TabType>('configuration');

  const tabs = [
    { id: 'configuration', label: t('admin.voiceManagement.tabs.configuration'), icon: Mic2 },
    { id: 'library', label: t('admin.voiceManagement.tabs.library'), icon: Library },
    { id: 'analytics', label: t('admin.voiceManagement.tabs.analytics'), icon: BarChart3 },
    { id: 'quotas', label: t('admin.voiceManagement.tabs.quotas'), icon: Shield },
    { id: 'settings', label: t('admin.voiceManagement.tabs.settings'), icon: Settings },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign }]}>
          {t('admin.voiceManagement.title')}
        </Text>
        <Text style={[styles.subtitle, { textAlign }]}>
          {t('admin.voiceManagement.subtitle')}
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <GlassButton
              key={tab.id}
              title={tab.label}
              icon={<Icon size={18} color={isActive ? colors.primary : colors.textMuted} />}
              variant={isActive ? 'primary' : 'secondary'}
              onPress={() => setActiveTab(tab.id as TabType)}
              style={styles.tabButton}
            />
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'configuration' && <VoiceConfigurationPanel />}
        {activeTab === 'library' && <VoiceLibraryPanel />}
        {activeTab === 'analytics' && <VoiceAnalyticsPanel />}
        {activeTab === 'quotas' && <QuotaManagementPanel />}
        {activeTab === 'settings' && <VoiceSettingsPanel />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    minWidth: 140,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
