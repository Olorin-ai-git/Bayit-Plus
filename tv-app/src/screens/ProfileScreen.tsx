import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassView, GlassButton } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';

type TabId = 'profile' | 'subscription' | 'notifications' | 'security';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'profile', icon: '👤', label: 'פרופיל' },
  { id: 'subscription', icon: '💳', label: 'מנוי' },
  { id: 'notifications', icon: '🔔', label: 'התראות' },
  { id: 'security', icon: '🛡️', label: 'אבטחה' },
];

const NOTIFICATION_SETTINGS = [
  { id: 'newContent', label: 'תוכן חדש', description: 'קבל התראות על סדרות וסרטים חדשים' },
  { id: 'liveEvents', label: 'אירועים בשידור חי', description: 'התראות על שידורים חיים מיוחדים' },
  { id: 'recommendations', label: 'המלצות', description: 'המלצות מותאמות אישית' },
  { id: 'updates', label: 'עדכוני מערכת', description: 'מידע חשוב על השירות' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    newContent: true,
    liveEvents: true,
    recommendations: false,
    updates: true,
  });

  if (!isAuthenticated) {
    navigation.navigate('Login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigation.navigate('Home');
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderProfileTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>פרטי פרופיל</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>שם</Text>
        <View style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{user?.name || 'לא הוגדר'}</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>אימייל</Text>
        <View style={styles.fieldValue}>
          <Text style={[styles.fieldValueText, styles.ltrText]}>{user?.email}</Text>
        </View>
      </View>

      <GlassButton
        title="ערוך פרופיל"
        onPress={() => {}}
        variant="primary"
        style={styles.editButton}
      />
    </GlassView>
  );

  const renderSubscriptionTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>פרטי מנוי</Text>

      {user?.subscription ? (
        <View>
          <GlassView style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.planName}>{user.subscription.plan}</Text>
              <Text style={styles.planPrice}>פעיל</Text>
            </View>
            <Text style={styles.subscriptionInfo}>
              סטטוס: {user.subscription.status}
            </Text>
            {user.subscription.end_date && (
              <Text style={styles.subscriptionInfo}>
                מתחדש ב-{user.subscription.end_date}
              </Text>
            )}
          </GlassView>

          <View style={styles.subscriptionActions}>
            <GlassButton
              title="שדרג מנוי"
              onPress={() => navigation.navigate('Subscribe')}
              variant="primary"
            />
            <GlassButton
              title="בטל מנוי"
              onPress={() => {}}
              variant="danger"
            />
          </View>
        </View>
      ) : (
        <View style={styles.noSubscription}>
          <Text style={styles.noSubIcon}>💳</Text>
          <Text style={styles.noSubText}>אין לך מנוי פעיל</Text>
          <GlassButton
            title="הצטרף עכשיו"
            onPress={() => navigation.navigate('Subscribe')}
            variant="primary"
          />
        </View>
      )}
    </GlassView>
  );

  const renderNotificationsTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>הגדרות התראות</Text>

      {NOTIFICATION_SETTINGS.map((item) => (
        <View key={item.id} style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>{item.label}</Text>
            <Text style={styles.notificationDesc}>{item.description}</Text>
          </View>
          <Switch
            value={notifications[item.id]}
            onValueChange={() => toggleNotification(item.id)}
            trackColor={{ false: colors.backgroundLight, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      ))}
    </GlassView>
  );

  const renderSecurityTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>אבטחה</Text>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>שנה סיסמה</Text>
          <Text style={styles.securityDesc}>עדכן את הסיסמה שלך</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>מכשירים מחוברים</Text>
          <Text style={styles.securityDesc}>נהל את המכשירים המחוברים לחשבון</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>אימות דו-שלבי</Text>
          <Text style={styles.securityDesc}>הוסף שכבת אבטחה נוספת</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>
    </GlassView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'subscription':
        return renderSubscriptionTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>⚙️</Text>
        </View>
        <View>
          <Text style={styles.title}>הגדרות חשבון</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <GlassView style={styles.sidebarCard}>
            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive,
                ]}
                // @ts-ignore
                hasTVPreferredFocus={index === 0 && isTV}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.tabIcon}>🚪</Text>
              <Text style={styles.logoutLabel}>התנתקות</Text>
            </TouchableOpacity>
          </GlassView>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
    width: '100%',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing.xxl,
  },
  sidebar: {
    width: isTV ? 280 : 200,
    marginLeft: spacing.xl,
  },
  sidebarCard: {
    padding: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  tabIcon: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  tabLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  logoutLabel: {
    fontSize: 16,
    color: colors.error,
  },
  mainContent: {
    flex: 1,
  },
  contentCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  fieldValue: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldValueText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
  editButton: {
    marginTop: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  subscriptionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '500',
  },
  subscriptionInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  subscriptionActions: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  noSubscription: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  noSubIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  noSubText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  notificationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  notificationDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityInfo: {
    flex: 1,
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  securityDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
});

export default ProfileScreen;
