import { useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { GlassTabs, GlassModal } from '@bayit/shared/ui';
import { spacing } from '@bayit/shared/theme';
import { HeroSection } from './components/HeroSection';
import { QuickActions } from './components/QuickActions';
import { OverviewTab } from './tabs/OverviewTab';
import { AIVoiceTab } from './tabs/AIVoiceTab';
import { SecurityTab } from './tabs/SecurityTab';
import { useProfileData } from './hooks/useProfileData';
import type { TabId } from './types';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'warning' | 'success' | 'info'>('error');

  const { stats, statsLoading, recentActivity, loadUserStats, loadRecentActivity } = useProfileData();

  const { loadPreferences: loadAIPreferences } = useAISettingsStore();
  const { loadPreferences: loadVoicePreferences } = useVoiceSettingsStore();

  const showModal = (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'error') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    loadAIPreferences();
    loadVoicePreferences();
    loadUserStats();
    loadRecentActivity();
  }, []);

  if (!isAuthenticated) {
    navigate('/login', { state: { from: '/profile' } });
    return null;
  }

  const tabs = [
    { id: 'overview' as TabId, label: t('profile.tabs.overview', 'Overview') },
    { id: 'ai' as TabId, label: t('profile.tabs.ai', 'AI & Voice') },
    { id: 'security' as TabId, label: t('profile.tabs.security', 'Security') },
  ];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' }}>
      <HeroSection
        isRTL={isRTL}
        stats={stats}
        statsLoading={statsLoading}
        onAvatarUploadSuccess={showModal}
      />

      <QuickActions isRTL={isRTL} onTabChange={setActiveTab} />

      <View className="mb-4">
        <GlassTabs
          tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      <View className="gap-4">
        {activeTab === 'overview' && <OverviewTab isRTL={isRTL} recentActivity={recentActivity} />}
        {activeTab === 'ai' && <AIVoiceTab isRTL={isRTL} />}
        {activeTab === 'security' && <SecurityTab isRTL={isRTL} />}
      </View>

      <GlassModal
        visible={modalVisible}
        type={modalType}
        title={
          modalType === 'error'
            ? t('common.error', 'Error')
            : modalType === 'success'
            ? t('common.success', 'Success')
            : t('common.warning', 'Warning')
        }
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={[{ text: t('common.ok', 'OK'), style: 'default' }]}
      />
    </ScrollView>
  );
}
