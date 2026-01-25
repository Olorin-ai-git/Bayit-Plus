/**
 * Support Ticket Card
 * Admin view of a support ticket in the dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

interface AdminTicket {
  id: string;
  user_id: string;
  user_email?: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  language: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface SupportTicketCardProps {
  ticket: AdminTicket;
  onPress: () => void;
}

const statusConfig: Record<string, { color: string; icon: string }> = {
  open: { color: colors.warning.DEFAULT, icon: '📝' },
  in_progress: { color: colors.primary.DEFAULT, icon: '⚙️' },
  resolved: { color: colors.success.DEFAULT, icon: '✅' },
  closed: { color: colors.textSecondary, icon: '📁' },
};

const priorityConfig: Record<string, { color: string }> = {
  urgent: { color: '#FF0000' },
  high: { color: colors.error },
  medium: { color: colors.warning },
  low: { color: colors.success },
};

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  es: '🇪🇸',
};

export const SupportTicketCard: React.FC<SupportTicketCardProps> = ({
  ticket,
  onPress,
}) => {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();
  const [isFocused, setIsFocused] = useState(false);

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return t('admin.support.time.justNow', 'Just now');
    } else if (diffHours < 24) {
      return t('admin.support.time.hoursAgo', '{{count}}h ago', { count: diffHours });
    } else if (diffDays < 7) {
      return t('admin.support.time.daysAgo', '{{count}}d ago', { count: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTimeUrgency = () => {
    const date = new Date(ticket.created_at);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (ticket.status === 'open') {
      if (diffHours > 24) return colors.error;
      if (diffHours > 12) return colors.warning;
    }
    return colors.textSecondary;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      activeOpacity={0.8}
    >
      <GlassView
        className={`p-4 rounded-2xl border-2 relative overflow-hidden ${
          isFocused ? 'border-purple-500' : 'border-transparent'
        } ${ticket.priority === 'urgent' ? 'border-red-500/30' : ''}`}
      >
        {/* Header Row */}
        <View className="justify-between mb-2" style={{ flexDirection }}>
          <View className="flex-row items-center gap-2">
            <Text className="font-bold text-gray-400 font-mono" style={{ fontSize: isTV ? 14 : 12 }}>
              #{ticket.id.slice(-6).toUpperCase()}
            </Text>
            <View
              className="flex-row items-center px-2 py-1 rounded-full gap-1"
              style={{ backgroundColor: `${status.color}20` }}
            >
              <Text style={{ fontSize: isTV ? 12 : 10 }}>{status.icon}</Text>
              <Text className="font-semibold" style={{ color: status.color, fontSize: isTV ? 12 : 10 }}>
                {t(`admin.support.status.${ticket.status}`, ticket.status)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <View
              className="rounded-full"
              style={{
                width: isTV ? 12 : 10,
                height: isTV ? 12 : 10,
                backgroundColor: priority.color
              }}
            />
            <Text style={{ fontSize: isTV ? 16 : 14 }}>
              {languageFlags[ticket.language] || '🌐'}
            </Text>
          </View>
        </View>

        {/* Subject */}
        <Text
          className="text-white font-semibold mb-1"
          style={[{ textAlign }, { fontSize: isTV ? 18 : 16 }]}
          numberOfLines={1}
        >
          {ticket.subject}
        </Text>

        {/* Message Preview */}
        <Text
          className="text-gray-400 mb-2"
          style={[{ textAlign }, { fontSize: isTV ? 14 : 12, lineHeight: isTV ? 20 : 18 }]}
          numberOfLines={2}
        >
          {ticket.message}
        </Text>

        {/* Footer Row */}
        <View className="justify-between items-center" style={{ flexDirection }}>
          <View className="flex-row items-center gap-2 flex-1">
            {ticket.user_email && (
              <Text className="text-gray-400 max-w-[150px]" style={{ fontSize: isTV ? 12 : 10 }} numberOfLines={1}>
                {ticket.user_email}
              </Text>
            )}
            <Text className="text-purple-500 capitalize" style={{ fontSize: isTV ? 12 : 10 }}>
              {t(`admin.support.category.${ticket.category}`, ticket.category)}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Text className="font-medium" style={{ color: getTimeUrgency(), fontSize: isTV ? 12 : 10 }}>
              {formatDate(ticket.created_at)}
            </Text>
            {ticket.assigned_to && (
              <View className="bg-purple-500/20 px-2 py-1 rounded-full">
                <Text className="text-purple-500 font-semibold" style={{ fontSize: isTV ? 10 : 8 }}>
                  {ticket.assigned_to}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Urgent Indicator */}
        {ticket.priority === 'urgent' && (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
        )}
      </GlassView>
    </TouchableOpacity>
  );
};

export default SupportTicketCard;
