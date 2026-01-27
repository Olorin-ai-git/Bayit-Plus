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
        <IconComponent size={20} color="#4a9eff" />
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
          <User size={24} color="#4a9eff" strokeWidth={2} />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </View>

      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color="#4a9eff" />
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
        <LogOut size={20} color="#e53935" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* App Version */}
      <Text style={styles.versionText}>Bayit+ v1.0.0</Text>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
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
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#0d0d1a',
  },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 2 },
  userEmail: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' },
  signInButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Subscription Banner
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  subscriptionInfo: { flex: 1 },
  subscriptionTitle: { fontSize: 16, fontWeight: '600', color: '#4a9eff', marginBottom: 2 },
  subscriptionSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  upgradeButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Menu Section
  menuSection: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '500', color: '#fff' },
  menuSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 },
  separator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginLeft: 64 },
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
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
  },
  signOutText: { color: '#e53935', fontWeight: '600', fontSize: 16 },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
