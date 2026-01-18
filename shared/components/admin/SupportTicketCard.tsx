/**
 * Support Ticket Card
 * Admin view of a support ticket in the dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
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
  open: { color: colors.warning, icon: '📝' },
  in_progress: { color: colors.primary, icon: '⚙️' },
  resolved: { color: colors.success, icon: '✅' },
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
        style={[
          styles.card,
          isFocused && styles.cardFocused,
          ticket.priority === 'urgent' && styles.cardUrgent,
        ]}
      >
        {/* Header Row */}
        <View style={[styles.header, { flexDirection }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.ticketId}>
              #{ticket.id.slice(-6).toUpperCase()}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${status.color}20` },
              ]}
            >
              <Text style={styles.statusIcon}>{status.icon}</Text>
              <Text style={[styles.statusText, { color: status.color }]}>
                {t(`admin.support.status.${ticket.status}`, ticket.status)}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.priorityIndicator,
                { backgroundColor: priority.color },
              ]}
            />
            <Text style={styles.languageFlag}>
              {languageFlags[ticket.language] || '🌐'}
            </Text>
          </View>
        </View>

        {/* Subject */}
        <Text
          style={[styles.subject, { textAlign }]}
          numberOfLines={1}
        >
          {ticket.subject}
        </Text>

        {/* Message Preview */}
        <Text
          style={[styles.messagePreview, { textAlign }]}
          numberOfLines={2}
        >
          {ticket.message}
        </Text>

        {/* Footer Row */}
        <View style={[styles.footer, { flexDirection }]}>
          <View style={styles.footerLeft}>
            {ticket.user_email && (
              <Text style={styles.userEmail} numberOfLines={1}>
                {ticket.user_email}
              </Text>
            )}
            <Text style={styles.category}>
              {t(`admin.support.category.${ticket.category}`, ticket.category)}
            </Text>
          </View>

          <View style={styles.footerRight}>
            <Text style={[styles.time, { color: getTimeUrgency() }]}>
              {formatDate(ticket.created_at)}
            </Text>
            {ticket.assigned_to && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>
                  {ticket.assigned_to}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Urgent Indicator */}
        {ticket.priority === 'urgent' && (
          <View style={styles.urgentStripe} />
        )}
      </GlassView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  cardFocused: {
    borderColor: colors.primary,
  },
  cardUrgent: {
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketId: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusIcon: {
    fontSize: isTV ? 12 : 10,
  },
  statusText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '600',
  },
  priorityIndicator: {
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
  },
  languageFlag: {
    fontSize: isTV ? 16 : 14,
  },
  subject: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  messagePreview: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 18,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userEmail: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    maxWidth: 150,
  },
  category: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  time: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '500',
  },
  assignedBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  assignedText: {
    fontSize: isTV ? 10 : 8,
    color: colors.primary,
    fontWeight: '600',
  },
  urgentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FF0000',
  },
});

export default SupportTicketCard;
