import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, Image } from 'react-native';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, CreditCard, Bell, LogOut, Shield, Sparkles, Mic, Star, Download,
  Clock, PlayCircle, Settings, ChevronRight, Camera, Edit3, MessageSquare,
  Zap, Brain, Volume2, Globe, Moon, Sun,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useVoiceSettingsStore } from '../../../shared/stores/voiceSettingsStore';
import { favoritesService, downloadsService, historyService, profilesService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassButton, GlassCard, GlassTabs, GlassModal } from '@bayit/shared/ui';

type TabId = 'overview' | 'ai' | 'security';

interface UserStats {
  favorites: number;
  downloads: number;
}

interface RecentActivity {
  id: string;
  type: 'watched' | 'favorited';
  title: string;
  timestamp: string;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin } = useAuthStore();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<UserStats>({ favorites: 0, downloads: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state for error/success messages
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'warning' | 'success' | 'info'>('error');

  const showModal = (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'error') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // AI Settings Store
  const {
    preferences: aiPreferences,
    loading: aiLoading,
    loadPreferences: loadAIPreferences,
    toggleSetting: toggleAISetting,
  } = useAISettingsStore();

  // Voice Settings Store
  const {
    preferences: voicePreferences,
    loading: voiceLoading,
    loadPreferences: loadVoicePreferences,
    toggleSetting: toggleVoiceSetting,
  } = useVoiceSettingsStore();

  // Load all preferences and stats on mount
  useEffect(() => {
    loadAIPreferences();
    loadVoicePreferences();
    loadUserStats();
    loadRecentActivity();
  }, []);

  // Load real user stats from APIs
  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      const [favoritesData, downloadsData] = await Promise.all([
        favoritesService.getFavorites().catch(() => ({ items: [] })),
        downloadsService.getDownloads().catch(() => []),
      ]);

      // Favorites returns { items: [...] }, downloads returns [...]
      const favoritesCount = favoritesData?.items?.length ?? 0;
      const downloadsCount = Array.isArray(downloadsData) ? downloadsData.length : 0;

      setStats({
        favorites: favoritesCount,
        downloads: downloadsCount,
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load recent activity from history API
  const loadRecentActivity = async () => {
    try {
      const historyData = await historyService.getContinueWatching().catch(() => []);

      if (Array.isArray(historyData) && historyData.length > 0) {
        // Convert history items to activity format
        const activities: RecentActivity[] = historyData.slice(0, 5).map((item: any) => ({
          id: item.content_id || item.id,
          type: 'watched' as const,
          title: item.title || item.content_title || 'Unknown',
          timestamp: item.updated_at || item.watched_at || new Date().toISOString(),
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  if (!isAuthenticated) {
    navigate('/login', { state: { from: '/profile' } });
    return null;
  }

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showModal(t('profile.invalidImageType', 'Please select a valid image file (JPEG, PNG, WebP, or GIF)'), 'warning');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showModal(t('profile.imageTooLarge', 'Image is too large. Maximum size is 5MB.'), 'warning');
      return;
    }

    setAvatarUploading(true);
    try {
      const response = await profilesService.uploadAvatar(file);
      // Update user in auth store with new avatar
      if (response?.url) {
        useAuthStore.setState((state) => ({
          user: state.user ? { ...state.user, avatar: response.url } : null,
        }));
        showModal(t('profile.uploadSuccess', 'Avatar updated successfully!'), 'success');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      showModal(t('profile.uploadFailed', 'Failed to upload avatar. Please try again.'), 'error');
    } finally {
      setAvatarUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Tab configuration (removed Preferences tab - no backend for notifications/appearance)
  const tabs = [
    { id: 'overview' as TabId, label: t('profile.tabs.overview', 'Overview') },
    { id: 'ai' as TabId, label: t('profile.tabs.ai', 'AI & Voice') },
    { id: 'security' as TabId, label: t('profile.tabs.security', 'Security') },
  ];

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('profile.justNow', 'Just now');
    if (diffHours < 24) return t('profile.hoursAgo', '{{hours}} hours ago', { hours: diffHours });
    if (diffDays === 1) return t('profile.yesterday', 'Yesterday');
    return date.toLocaleDateString();
  };

  // Toggle component
  const Toggle = ({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.toggle, value && styles.toggleActive, disabled && styles.toggleDisabled]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </Pressable>
  );

  // Setting row component
  const SettingRow = ({
    icon: Icon,
    iconColor = colors.primary,
    label,
    description,
    value,
    onToggle,
    disabled,
  }: {
    icon: any;
    iconColor?: string;
    label: string;
    description?: string;
    value?: boolean;
    onToggle?: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled || !onToggle}
      style={[styles.settingRow, isRTL && styles.settingRowRTL, disabled && styles.settingRowDisabled]}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{label}</Text>
        {description && (
          <Text style={[styles.settingDesc, isRTL && styles.textRTL]}>{description}</Text>
        )}
      </View>
      {value !== undefined && onToggle && (
        <Toggle value={value} onToggle={onToggle} disabled={disabled} />
      )}
    </Pressable>
  );

  // Action button component
  const ActionButton = ({
    icon: Icon,
    iconColor = colors.primary,
    label,
    onPress,
  }: {
    icon: any;
    iconColor?: string;
    label: string;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <GlassView style={styles.actionButtonInner}>
        <View style={[styles.actionIcon, { backgroundColor: `${iconColor}20` }]}>
          <Icon size={24} color={iconColor} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </GlassView>
    </Pressable>
  );

  // Stat card component
  const StatCard = ({
    icon: Icon,
    iconColor = colors.primary,
    label,
    value,
    loading,
  }: {
    icon: any;
    iconColor?: string;
    label: string;
    value: string | number;
    loading?: boolean;
  }) => (
    <GlassView style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{loading ? '...' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <GlassView style={styles.heroSection} intensity="medium">
        <View style={[styles.heroContent, isRTL && styles.heroContentRTL]}>
          {/* Avatar with upload */}
          <View style={styles.avatarSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <Pressable onPress={handleAvatarClick} disabled={avatarUploading}>
              <View style={styles.avatarContainer}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                {avatarUploading && (
                  <View style={styles.avatarLoadingOverlay}>
                    <Text style={styles.avatarLoadingText}>...</Text>
                  </View>
                )}
                <View style={styles.editAvatarButton}>
                  <Camera size={16} color={colors.text} />
                </View>
              </View>
            </Pressable>
          </View>

          {/* User Info */}
          <View style={[styles.userInfo, isRTL && styles.userInfoRTL]}>
            <View style={[styles.nameRow, isRTL && styles.nameRowRTL]}>
              <Text style={[styles.userName, isRTL && styles.textRTL]}>{user?.name || t('profile.guest')}</Text>
              {isAdmin() && (
                <View style={styles.adminBadge}>
                  <Shield size={12} color={colors.warning} />
                  <Text style={styles.adminBadgeText}>{t('profile.admin', 'Admin')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user?.email}</Text>

            {/* Subscription Badge */}
            {user?.subscription ? (
              <View style={[styles.subscriptionBadge, isRTL && styles.subscriptionBadgeRTL]}>
                <Zap size={14} color={colors.warning} />
                <Text style={styles.subscriptionText}>
                  {user.subscription.plan === 'premium'
                    ? t('profile.premium', 'Premium')
                    : t('profile.basic', 'Basic')}
                </Text>
              </View>
            ) : (
              <Link to="/subscribe" style={{ textDecoration: 'none' }}>
                <View style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>{t('profile.upgrade', 'Upgrade to Premium')}</Text>
                </View>
              </Link>
            )}

            {/* Member Since */}
            <Text style={[styles.memberSince, isRTL && styles.textRTL]}>
              {t('profile.memberSince', 'Member since')} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </Text>
          </View>
        </View>

        {/* Quick Stats - Only showing stats with real API support */}
        <View style={styles.statsRow}>
          <StatCard
            icon={Star}
            iconColor={colors.warning}
            label={t('profile.favorites', 'Favorites')}
            value={stats.favorites}
            loading={statsLoading}
          />
          <StatCard
            icon={Download}
            iconColor={colors.success}
            label={t('profile.downloads', 'Downloads')}
            value={stats.downloads}
            loading={statsLoading}
          />
        </View>
      </GlassView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <ActionButton
          icon={MessageSquare}
          iconColor={colors.primary}
          label={t('profile.aiAssistant', 'AI Assistant')}
          onPress={() => setActiveTab('ai')}
        />
        <ActionButton
          icon={Mic}
          iconColor="#8B5CF6"
          label={t('profile.voiceSettings', 'Voice')}
          onPress={() => setActiveTab('ai')}
        />
        <ActionButton
          icon={CreditCard}
          iconColor={colors.success}
          label={t('profile.subscriptionButton', 'Subscription')}
          onPress={() => navigate('/subscribe')}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <GlassTabs
          tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.sectionGrid}>
            {/* Recent Activity - Real data from history API */}
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.recentActivity', 'Recent Activity')}
              </Text>
              <View style={styles.activityList}>
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <View key={activity.id} style={[styles.activityItem, isRTL && styles.activityItemRTL]}>
                      {activity.type === 'watched' ? (
                        <PlayCircle size={20} color={colors.primary} />
                      ) : (
                        <Star size={20} color={colors.warning} />
                      )}
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                          {activity.title}
                        </Text>
                        <Text style={[styles.activityTime, isRTL && styles.textRTL]}>
                          {formatTimestamp(activity.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                    {t('profile.noRecentActivity', 'No recent activity')}
                  </Text>
                )}
              </View>
            </GlassView>

            {/* Account Info */}
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.accountInfo', 'Account Information')}
              </Text>
              <View style={styles.infoList}>
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={styles.infoLabel}>{t('profile.name', 'Name')}</Text>
                  <Text style={styles.infoValue}>{user?.name || '-'}</Text>
                </View>
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={styles.infoLabel}>{t('profile.email', 'Email')}</Text>
                  <Text style={styles.infoValue}>{user?.email || '-'}</Text>
                </View>
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={styles.infoLabel}>{t('profile.role', 'Role')}</Text>
                  <Text style={styles.infoValue}>{user?.role || 'user'}</Text>
                </View>
              </View>
            </GlassView>
          </View>
        )}

        {/* AI & Voice Tab */}
        {activeTab === 'ai' && (
          <View style={styles.sectionGrid}>
            {/* AI Assistant - Connected to aiSettingsStore */}
            <GlassView style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Brain size={24} color="#8B5CF6" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('profile.ai.assistant', 'AI Assistant')}
                  </Text>
                  <Text style={[styles.sectionSubtitle, isRTL && styles.textRTL]}>
                    {t('profile.ai.assistantDesc', 'Personalized recommendations and help')}
                  </Text>
                </View>
              </View>

              <SettingRow
                icon={MessageSquare}
                iconColor={colors.primary}
                label={t('profile.ai.chatbotEnabled', 'Enable AI Assistant')}
                description={t('profile.ai.chatbotEnabledDesc', 'Get help navigating content')}
                value={aiPreferences.chatbot_enabled}
                onToggle={() => toggleAISetting('chatbot_enabled')}
                disabled={aiLoading}
              />
              <SettingRow
                icon={Clock}
                iconColor="#8B5CF6"
                label={t('profile.ai.saveHistory', 'Save Conversation History')}
                description={t('profile.ai.saveHistoryDesc', 'Remember previous conversations')}
                value={aiPreferences.save_conversation_history}
                onToggle={() => toggleAISetting('save_conversation_history')}
                disabled={aiLoading || !aiPreferences.chatbot_enabled}
              />
              <SettingRow
                icon={Sparkles}
                iconColor={colors.warning}
                label={t('profile.ai.personalizedRecs', 'Personalized Recommendations')}
                description={t('profile.ai.personalizedRecsDesc', 'Content suggestions based on history')}
                value={aiPreferences.personalized_recommendations}
                onToggle={() => toggleAISetting('personalized_recommendations')}
                disabled={aiLoading}
              />
            </GlassView>

            {/* Voice Settings - Connected to voiceSettingsStore */}
            <GlassView style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(107, 33, 168, 0.3)' }]}>
                  <Mic size={24} color={colors.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('profile.voice.title', 'Voice Control')}
                  </Text>
                  <Text style={[styles.sectionSubtitle, isRTL && styles.textRTL]}>
                    {t('profile.voice.description', 'Hands-free navigation')}
                  </Text>
                </View>
              </View>

              <SettingRow
                icon={Mic}
                iconColor={colors.primary}
                label={t('profile.voice.enabled', 'Voice Commands')}
                description={t('profile.voice.enabledDesc', 'Control the app with your voice')}
                value={voicePreferences.voice_search_enabled}
                onToggle={() => toggleVoiceSetting('voice_search_enabled')}
                disabled={voiceLoading}
              />
              <SettingRow
                icon={Volume2}
                iconColor={colors.success}
                label={t('profile.voice.tts', 'Text-to-Speech')}
                description={t('profile.voice.ttsDesc', 'AI responses read aloud')}
                value={voicePreferences.tts_enabled}
                onToggle={() => toggleVoiceSetting('tts_enabled')}
                disabled={voiceLoading}
              />
              <SettingRow
                icon={Bell}
                iconColor="#F59E0B"
                label={t('profile.voice.wakeWord', 'Wake Word Detection')}
                description={t('profile.voice.wakeWordDesc', 'Say "Buyit" to activate')}
                value={voicePreferences.wake_word_enabled}
                onToggle={() => toggleVoiceSetting('wake_word_enabled')}
                disabled={voiceLoading}
              />
            </GlassView>

            {/* Privacy - Connected to aiSettingsStore */}
            <GlassView style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Shield size={24} color={colors.success} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('profile.ai.privacy', 'Privacy & Data')}
                  </Text>
                  <Text style={[styles.sectionSubtitle, isRTL && styles.textRTL]}>
                    {t('profile.ai.privacyDesc', 'Your data is encrypted and secure')}
                  </Text>
                </View>
              </View>

              <SettingRow
                icon={Shield}
                iconColor={colors.success}
                label={t('profile.ai.dataConsent', 'Usage Analytics')}
                description={t('profile.ai.dataConsentDesc', 'Help improve AI features')}
                value={aiPreferences.data_collection_consent}
                onToggle={() => toggleAISetting('data_collection_consent')}
                disabled={aiLoading}
              />
            </GlassView>
          </View>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <View style={styles.sectionGrid}>
            {/* Account Security Info - Read only, no actions without backend */}
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.accountSecurity', 'Account Security')}
              </Text>
              <View style={styles.securityInfo}>
                <View style={[styles.securityInfoRow, isRTL && styles.securityInfoRowRTL]}>
                  <Shield size={20} color={colors.success} />
                  <Text style={[styles.securityInfoText, isRTL && styles.textRTL]}>
                    {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                  </Text>
                </View>
                {user?.last_login && (
                  <View style={[styles.securityInfoRow, isRTL && styles.securityInfoRowRTL]}>
                    <Clock size={20} color={colors.textMuted} />
                    <Text style={[styles.securityInfoText, isRTL && styles.textRTL]}>
                      {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </GlassView>

            {/* Danger Zone */}
            <GlassView style={[styles.section, styles.dangerSection]}>
              <Text style={[styles.sectionTitle, { color: colors.error }, isRTL && styles.textRTL]}>
                {t('profile.dangerZone', 'Danger Zone')}
              </Text>
              <Pressable onPress={handleLogout} style={[styles.logoutButton, isRTL && styles.logoutButtonRTL]}>
                <LogOut size={20} color={colors.error} />
                <Text style={styles.logoutText}>{t('account.logout', 'Sign Out')}</Text>
              </Pressable>
            </GlassView>
          </View>
        )}
      </View>

      {/* Glass Modal for messages */}
      <GlassModal
        visible={modalVisible}
        type={modalType}
        title={modalType === 'error' ? t('common.error', 'Error') : modalType === 'success' ? t('common.success', 'Success') : t('common.warning', 'Warning')}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={[{ text: t('common.ok', 'OK'), style: 'default' }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  // Hero Section
  heroSection: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroContentRTL: {
    flexDirection: 'row-reverse',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingText: {
    fontSize: 24,
    color: colors.text,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
  },
  userInfoRTL: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nameRowRTL: {
    flexDirection: 'row-reverse',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  userEmail: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  subscriptionBadgeRTL: {
    alignSelf: 'flex-end',
  },
  subscriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberSince: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  actionButtonInner: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  // Tabs
  tabsContainer: {
    marginBottom: spacing.lg,
  },
  tabContent: {
    gap: spacing.lg,
  },
  sectionGrid: {
    gap: spacing.lg,
  },
  // Sections
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Toggle
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  // Activity
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityItemRTL: {
    flexDirection: 'row-reverse',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Info
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  // Security
  securityInfo: {
    gap: spacing.md,
  },
  securityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  securityInfoRowRTL: {
    flexDirection: 'row-reverse',
  },
  securityInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  // Danger Zone
  dangerSection: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutButtonRTL: {
    flexDirection: 'row-reverse',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
  },
  // RTL
  textRTL: {
    textAlign: 'right',
  },
});
