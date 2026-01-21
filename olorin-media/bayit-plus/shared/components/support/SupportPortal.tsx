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
          <View className="gap-4">
            <SupportSearch />
            <SupportCategories />
          </View>
        );

      case 'faq':
        return <SupportFAQ />;

      case 'contact':
        return (
          <View className="gap-4">
            <GlassView className="p-4 rounded-2xl items-center">
              <Text className={`text-4xl mb-3 ${isTV ? 'text-5xl' : ''}`}>💬</Text>
              <Text className={`text-white text-lg font-semibold mb-2 ${isTV ? 'text-xl' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
                {t('support.contact.voiceTitle', 'Voice Support')}
              </Text>
              <Text className={`text-text-secondary text-sm leading-5 mb-3 ${isTV ? 'text-base leading-6' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
                {t('support.contact.voiceDescription', 'Click the avatar button or say "Hey Bayit" to start a voice conversation with our AI assistant.')}
              </Text>
            </GlassView>

            <GlassView className="p-4 rounded-2xl items-center">
              <Text className={`text-4xl mb-3 ${isTV ? 'text-5xl' : ''}`}>🎫</Text>
              <Text className={`text-white text-lg font-semibold mb-2 ${isTV ? 'text-xl' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
                {t('support.contact.ticketTitle', 'Create Support Ticket')}
              </Text>
              <Text className={`text-text-secondary text-sm leading-5 mb-3 ${isTV ? 'text-base leading-6' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
                {t('support.contact.ticketDescription', 'Need human assistance? Create a support ticket and our team will respond within 24 hours.')}
              </Text>
              <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-lg"
                onPress={() => setShowTicketForm(true)}
              >
                <Text className={`text-background font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>
                  {t('support.contact.createTicket', 'Create Ticket')}
                </Text>
              </TouchableOpacity>
            </GlassView>

            <GlassView className="p-4 rounded-2xl items-center">
              <Text className={`text-4xl mb-3 ${isTV ? 'text-5xl' : ''}`}>📧</Text>
              <Text className={`text-white text-lg font-semibold mb-2 ${isTV ? 'text-xl' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
                {t('support.contact.emailTitle', 'Email Support')}
              </Text>
              <Text className={`text-text-secondary text-sm leading-5 ${isTV ? 'text-base leading-6' : ''} ${textAlign === 'right' ? 'text-right' : 'text-center'}`}>
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
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className={`flex-row items-center gap-3 ${isTV ? 'p-6' : 'p-4'} pb-3`} style={{ flexDirection }}>
        <View className={`justify-center items-center bg-primary/20 ${isTV ? 'w-16 h-16 rounded-[32px]' : 'w-12 h-12 rounded-3xl'}`}>
          <Text className={isTV ? 'text-4xl' : 'text-2xl'}>🎧</Text>
        </View>
        <View>
          <Text className={`text-white font-bold ${isTV ? 'text-4xl' : 'text-3xl'} ${textAlign === 'right' ? 'text-right' : ''}`}>
            {t('support.title', 'Support Center')}
          </Text>
          <Text className={`text-text-secondary mt-0.5 ${isTV ? 'text-lg' : 'text-sm'} ${textAlign === 'right' ? 'text-right' : ''}`}>
            {t('support.subtitle', 'How can we help you today?')}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`mb-3 ${isTV ? 'px-6' : 'px-4'}`}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            onFocus={() => setFocusedTab(tab.id)}
            onBlur={() => setFocusedTab(null)}
            className={`flex-row items-center px-4 py-2 bg-white/5 rounded-full gap-2 border-2 ${
              activeTab === tab.id ? 'bg-primary/20' : ''
            } ${
              focusedTab === tab.id ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text className={isTV ? 'text-xl' : 'text-base'}>{tab.icon}</Text>
            <Text
              className={`${isTV ? 'text-base' : 'text-sm'} ${
                activeTab === tab.id ? 'text-primary font-semibold' : 'text-text-secondary'
              }`}
            >
              {t(tab.labelKey, tab.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: isTV ? spacing.xl : spacing.lg,
          paddingTop: 0,
          paddingBottom: spacing.xl * 2,
        }}
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

export default SupportPortal;
