/**
 * Support Portal
 * Main container for the enterprise support system
 * Features tabbed navigation: Docs | FAQ | Contact | Tickets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, SupportTab } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { SupportCategories } from './SupportCategories';
import { SupportDocViewer } from './SupportDocViewer';
import { SupportSearch } from './SupportSearch';
import { SupportFAQ } from './SupportFAQ';
import { SupportTicketForm } from './SupportTicketForm';
import { SupportTicketList } from './SupportTicketList';

interface TabConfig {
  id: SupportTab;
  labelKey: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'docs', labelKey: 'support.tabs.docs', icon: '📚' },
  { id: 'faq', labelKey: 'support.tabs.faq', icon: '❓' },
  { id: 'contact', labelKey: 'support.tabs.contact', icon: '💬' },
  { id: 'tickets', labelKey: 'support.tabs.tickets', icon: '🎫' },
];

export const SupportPortal: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { activeTab, setActiveTab, currentDocPath } = useSupportStore();
  const [focusedTab, setFocusedTab] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'docs':
        if (currentDocPath) {
          return <SupportDocViewer />;
        }
        return (
          <View style={styles.docsContainer}>
            <SupportSearch />
            <SupportCategories />
          </View>
        );

      case 'faq':
        return <SupportFAQ />;

      case 'contact':
        return (
          <View style={styles.contactContainer}>
            <GlassView style={styles.contactCard}>
              <Text style={styles.contactIcon}>💬</Text>
              <Text style={[styles.contactTitle, { textAlign }]}>
                {t('support.contact.voiceTitle', 'Voice Support')}
              </Text>
              <Text style={[styles.contactDescription, { textAlign }]}>
                {t('support.contact.voiceDescription', 'Click the avatar button or say "Hey Bayit" to start a voice conversation with our AI assistant.')}
              </Text>
            </GlassView>

            <GlassView style={styles.contactCard}>
              <Text style={styles.contactIcon}>🎫</Text>
              <Text style={[styles.contactTitle, { textAlign }]}>
                {t('support.contact.ticketTitle', 'Create Support Ticket')}
              </Text>
              <Text style={[styles.contactDescription, { textAlign }]}>
                {t('support.contact.ticketDescription', 'Need human assistance? Create a support ticket and our team will respond within 24 hours.')}
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => setShowTicketForm(true)}
              >
                <Text style={styles.contactButtonText}>
                  {t('support.contact.createTicket', 'Create Ticket')}
                </Text>
              </TouchableOpacity>
            </GlassView>

            <GlassView style={styles.contactCard}>
              <Text style={styles.contactIcon}>📧</Text>
              <Text style={[styles.contactTitle, { textAlign }]}>
                {t('support.contact.emailTitle', 'Email Support')}
              </Text>
              <Text style={[styles.contactDescription, { textAlign }]}>
                {t('support.contact.emailDescription', 'Prefer email? Reach us at support@bayit.tv for any questions or concerns.')}
              </Text>
            </GlassView>

            {showTicketForm && (
              <SupportTicketForm onClose={() => setShowTicketForm(false)} />
            )}
          </View>
        );

      case 'tickets':
        return <SupportTicketList />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🎧</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>
            {t('support.title', 'Support Center')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('support.subtitle', 'How can we help you today?')}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            onFocus={() => setFocusedTab(tab.id)}
            onBlur={() => setFocusedTab(null)}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive,
              focusedTab === tab.id && styles.tabButtonFocused,
            ]}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {t(tab.labelKey, tab.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: isTV ? 64 : 48,
    height: isTV ? 64 : 48,
    borderRadius: isTV ? 32 : 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: isTV ? 32 : 24,
  },
  title: {
    fontSize: isTV ? 36 : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: isTV ? 18 : 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabsScroll: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    marginBottom: spacing.md,
  },
  tabsContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  tabButtonFocused: {
    borderColor: colors.primary,
  },
  tabIcon: {
    fontSize: isTV ? 20 : 16,
  },
  tabText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl * 2,
  },
  docsContainer: {
    gap: spacing.lg,
  },
  contactContainer: {
    gap: spacing.lg,
  },
  contactCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  contactIcon: {
    fontSize: isTV ? 48 : 36,
    marginBottom: spacing.md,
  },
  contactTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  contactDescription: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 24 : 20,
    marginBottom: spacing.md,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  contactButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.background,
  },
});

export default SupportPortal;
