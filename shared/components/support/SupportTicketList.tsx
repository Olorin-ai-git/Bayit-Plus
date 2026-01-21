/**
 * Support Ticket List
 * Displays user's support tickets with status and details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, SupportTicket } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { SupportTicketForm } from './SupportTicketForm';

const statusConfig: Record<string, { color: string; icon: string }> = {
  open: { color: colors.warning, icon: '📝' },
  in_progress: { color: colors.primary, icon: '⚙️' },
  resolved: { color: colors.success, icon: '✅' },
  closed: { color: colors.textSecondary, icon: '📁' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: colors.success, label: 'Low' },
  medium: { color: colors.warning, label: 'Medium' },
  high: { color: colors.error, label: 'High' },
  urgent: { color: '#FF0000', label: 'Urgent' },
};

interface TicketCardProps {
  ticket: SupportTicket;
  onPress: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPress }) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          styles.ticketCard,
          isFocused && styles.ticketCardFocused,
        ]}
      >
        {/* Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.ticketIdContainer}>
            <Text style={styles.ticketId}>#{ticket.id.slice(-6).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <Text style={styles.statusIcon}>{status.icon}</Text>
              <Text style={[styles.statusText, { color: status.color }]}>
                {t(`support.ticket.status.${ticket.status}`, ticket.status)}
              </Text>
            </View>
          </View>
          <View style={[styles.priorityBadge, { borderColor: priority.color }]}>
            <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {t(`support.ticket.priority.${ticket.priority}`, priority.label)}
            </Text>
          </View>
        </View>

        {/* Subject */}
        <Text style={[styles.ticketSubject, { textAlign }]} numberOfLines={2}>
          {ticket.subject}
        </Text>

        {/* Message Preview */}
        <Text style={[styles.ticketMessage, { textAlign }]} numberOfLines={2}>
          {ticket.message}
        </Text>

        {/* Footer */}
        <View style={styles.ticketFooter}>
          <Text style={styles.ticketDate}>
            {formatDate(ticket.createdAt)}
          </Text>
          <Text style={styles.ticketCategory}>
            {t(`support.ticket.category.${ticket.category}`, ticket.category)}
          </Text>
        </View>
      </GlassView>
    </TouchableOpacity>
  );
};

export const SupportTicketList: React.FC = () => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { tickets, setTickets } = useSupportStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [focusedFilter, setFocusedFilter] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setError(null);

      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(`${apiUrl}/tickets`);

      if (!response.ok) {
        throw new Error('Failed to load tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('[SupportTicketList] Error loading tickets:', err);
      setError(t('support.tickets.loadError', 'Failed to load tickets'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleTicketPress = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const filters = [
    { id: 'all', labelKey: 'support.tickets.filter.all' },
    { id: 'open', labelKey: 'support.tickets.filter.open' },
    { id: 'in_progress', labelKey: 'support.tickets.filter.inProgress' },
    { id: 'resolved', labelKey: 'support.tickets.filter.resolved' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { textAlign }]}>
          {t('support.tickets.loading', 'Loading tickets...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Create Button */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('support.tickets.title', 'My Support Tickets')}
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.createButtonIcon}>+</Text>
          <Text style={styles.createButtonText}>
            {t('support.tickets.create', 'New Ticket')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            onFocus={() => setFocusedFilter(f.id)}
            onBlur={() => setFocusedFilter(null)}
            style={[
              styles.filterButton,
              filter === f.id && styles.filterButtonActive,
              focusedFilter === f.id && styles.filterButtonFocused,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.id && styles.filterTextActive,
              ]}
            >
              {t(f.labelKey, f.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTickets}>
            <Text style={styles.retryButtonText}>
              {t('common.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ticket List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={[styles.emptyText, { textAlign }]}>
              {filter === 'all'
                ? t('support.tickets.empty', 'No support tickets yet')
                : t('support.tickets.emptyFilter', 'No tickets with this status')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.emptyButtonText}>
                {t('support.tickets.createFirst', 'Create Your First Ticket')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onPress={() => handleTicketPress(ticket)}
            />
          ))
        )}
      </ScrollView>

      {/* Ticket Form Modal */}
      {showForm && (
        <SupportTicketForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadTickets();
          }}
        />
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </View>
  );
};

interface TicketDetailModalProps {
  ticket: SupportTicket;
  onClose: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.detailOverlay}>
      <GlassView style={styles.detailModal}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailId}>
                #{ticket.id.slice(-6).toUpperCase()}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                <Text style={styles.statusIcon}>{status.icon}</Text>
                <Text style={[styles.statusText, { color: status.color }]}>
                  {t(`support.ticket.status.${ticket.status}`, ticket.status)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <Text style={[styles.detailSubject, { textAlign }]}>
            {ticket.subject}
          </Text>

          {/* Meta Info */}
          <View style={styles.detailMeta}>
            <View style={styles.detailMetaItem}>
              <Text style={styles.detailMetaLabel}>
                {t('support.ticket.categoryLabel', 'Category')}
              </Text>
              <Text style={styles.detailMetaValue}>
                {t(`support.ticket.category.${ticket.category}`, ticket.category)}
              </Text>
            </View>
            <View style={styles.detailMetaItem}>
              <Text style={styles.detailMetaLabel}>
                {t('support.ticket.priorityLabel', 'Priority')}
              </Text>
              <View style={styles.priorityInline}>
                <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                <Text style={[styles.detailMetaValue, { color: priority.color }]}>
                  {t(`support.ticket.priority.${ticket.priority}`, priority.label)}
                </Text>
              </View>
            </View>
            <View style={styles.detailMetaItem}>
              <Text style={styles.detailMetaLabel}>
                {t('support.ticket.created', 'Created')}
              </Text>
              <Text style={styles.detailMetaValue}>
                {formatDate(ticket.createdAt)}
              </Text>
            </View>
          </View>

          {/* Message */}
          <View style={styles.detailMessageContainer}>
            <Text style={styles.detailMessageLabel}>
              {t('support.ticket.message', 'Message')}
            </Text>
            <Text style={[styles.detailMessage, { textAlign }]}>
              {ticket.message}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.detailCloseButton} onPress={onClose}>
            <Text style={styles.detailCloseButtonText}>
              {t('common.close', 'Close')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  createButtonIcon: {
    fontSize: isTV ? 20 : 16,
    color: colors.background,
    fontWeight: 'bold',
  },
  createButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
  filtersScroll: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  filterButtonFocused: {
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  ticketCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ticketCardFocused: {
    borderColor: colors.primary,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketId: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  priorityDot: {
    width: isTV ? 8 : 6,
    height: isTV ? 8 : 6,
    borderRadius: isTV ? 4 : 3,
  },
  priorityText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '500',
  },
  ticketSubject: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketMessage: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 18,
    marginBottom: spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
  },
  ticketCategory: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: isTV ? 14 : 12,
    color: colors.error,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: isTV ? 64 : 48,
  },
  emptyText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  detailModal: {
    width: '100%',
    maxWidth: isTV ? 600 : 500,
    maxHeight: '90%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  detailId: {
    fontSize: isTV ? 18 : 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  closeButton: {
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: isTV ? 20 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isTV ? 20 : 16,
    color: colors.text,
  },
  detailSubject: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailMetaItem: {
    gap: spacing.xs,
  },
  detailMetaLabel: {
    fontSize: isTV ? 12 : 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  detailMetaValue: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    fontWeight: '500',
  },
  priorityInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMessageContainer: {
    marginBottom: spacing.lg,
  },
  detailMessageLabel: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailMessage: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 22 : 20,
  },
  detailCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  detailCloseButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
});

export default SupportTicketList;
