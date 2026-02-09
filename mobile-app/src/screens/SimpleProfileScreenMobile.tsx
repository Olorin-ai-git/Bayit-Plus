/**
 * Profile Screen Mobile
 *
 * Glass UI styled user profile and settings
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  User,
  Settings,
  Heart,
  Clock,
  Download,
  Bell,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  onPress?: () => void;
  showArrow?: boolean;
}

const MENU_SECTIONS = [
  {
    title: 'Content',
    items: [
      { id: '1', title: 'Favorites', subtitle: '23 items saved', icon: Heart, showArrow: true },
      { id: '2', title: 'Watch History', subtitle: 'Recently watched', icon: Clock, showArrow: true },
      { id: '3', title: 'Downloads', subtitle: '5 items offline', icon: Download, showArrow: true },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: '4', title: 'Notifications', subtitle: 'Push and email', icon: Bell, showArrow: true },
      { id: '5', title: 'Language', subtitle: 'Hebrew', icon: Globe, showArrow: true },
      { id: '6', title: 'Dark Mode', subtitle: 'Always on', icon: Moon, showArrow: true },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: '7', title: 'Help Center', icon: HelpCircle, showArrow: true },
      { id: '8', title: 'App Settings', icon: Settings, showArrow: true },
    ],
  },
];

function MenuItem({ item }: { item: MenuItem }) {
  const IconComponent = item.icon;
  return (
    <Pressable style={styles.menuItem}>
      <View style={styles.menuIconContainer}>
        <IconComponent size={20} color={Colors.Info.default} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
      </View>
      {item.showArrow && <ChevronRight size={20} color="rgba(255, 255, 255, 0.3)" />}
    </Pressable>
  );
}

export function ProfileScreenMobile() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <User size={24} color={Colors.Info.default} strokeWidth={2} />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </View>

      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color={Colors.Info.default} />
          </View>
          <View style={styles.onlineIndicator} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>Guest User</Text>
          <Text style={styles.userEmail}>Sign in to sync your content</Text>
        </View>
        <Pressable style={styles.signInButton}>
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>

      {/* Subscription Banner */}
      <View style={styles.subscriptionBanner}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionTitle}>Free Plan</Text>
          <Text style={styles.subscriptionSubtitle}>Upgrade for unlimited access</Text>
        </View>
        <Pressable style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </Pressable>
      </View>

      {/* Menu Sections */}
      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <View key={item.id}>
                <MenuItem item={item} />
                {index < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out */}
      <Pressable style={styles.signOutButton}>
        <LogOut size={20} color={Colors.Error.e600} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* App Version */}
      <Text style={styles.versionText}>Bayit+ v1.0.0</Text>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  content: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.Text.primary },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.Glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.Success.default,
    borderWidth: 2,
    borderColor: Colors.Background.primary,
  },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: Colors.Text.primary, marginBottom: 2 },
  userEmail: { fontSize: 13, color: Colors.Text.muted },
  signInButton: {
    backgroundColor: Colors.Info.default,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInText: { color: Colors.Text.primary, fontWeight: '600', fontSize: 14 },
  // Subscription Banner
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Glass.borderLight,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  subscriptionInfo: { flex: 1 },
  subscriptionTitle: { fontSize: 16, fontWeight: '600', color: Colors.Info.default, marginBottom: 2 },
  subscriptionSubtitle: { fontSize: 12, color: Colors.Text.muted },
  upgradeButton: {
    backgroundColor: Colors.Info.default,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeText: { color: Colors.Text.primary, fontWeight: '600', fontSize: 14 },
  // Menu Section
  menuSection: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.Glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '500', color: Colors.Text.primary },
  menuSubtitle: { fontSize: 12, color: Colors.Text.muted, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.Glass.bgLight, marginLeft: 64 },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Error.e600,
  },
  signOutText: { color: Colors.Error.e600, fontWeight: '600', fontSize: 16 },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.Text.disabled,
  },
});
