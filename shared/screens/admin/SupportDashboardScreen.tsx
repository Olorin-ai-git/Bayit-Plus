/**
 * Support Dashboard Screen
 * Admin interface for managing support tickets
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../../components/ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { SupportTicketCard } from '../../components/admin/SupportTicketCard';
import { SupportTicketDetail } from '../../components/admin/SupportTicketDetail';
import { supportConfig } from '../../config/supportConfig';

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
  notes: Array<{
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
}

export const SupportDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [focusedFilter, setFocusedFilter] = useState<string | null>(null);

  const API_ENDPOINT = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/v1/support'
    : '/api/v1/support';

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);

      const [ticketsResponse, analyticsResponse] = await Promise.all([
        fetch(`${API_ENDPOINT}/admin/tickets`),
        fetch(`${API_ENDPOINT}/admin/analytics`),
      ]);

      if (!ticketsResponse.ok) {
        throw new Error('Failed to load tickets');
      }

      const ticketsData = await ticketsResponse.json();
      setTickets(ticketsData.tickets || []);

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setStats({
          total: analyticsData.total_tickets || 0,
          open: analyticsData.by_status?.open || 0,
          in_progress: analyticsData.by_status?.in_progress || 0,
          resolved: analyticsData.by_status?.resolved || 0,
          high_priority: analyticsData.by_priority?.high || 0,
        });
      }
    } catch (err) {
      console.error('[SupportDashboard] Error loading data:', err);
      setError(t('admin.support.loadError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_ENDPOINT, t]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleTicketSelect = (ticket: AdminTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketClose = () => {
    setSelectedTicket(null);
  };

  const handleTicketUpdate = async (
    ticketId: string,
    updates: { status?: string; assigned_to?: string; note?: string }
  ) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }

      // Refresh data
      await loadDashboardData();

      // Update selected ticket if it was the one updated
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = tickets.find((t) => t.id === ticketId);
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (err) {
      console.error('[SupportDashboard] Error updating ticket:', err);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const statusMatch = filter === 'all' || ticket.status === filter;
    const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const statusFilters = [
    { id: 'all', label: t('admin.support.filter.all', 'All') },
    { id: 'open', label: t('admin.support.filter.open', 'Open') },
    { id: 'in_progress', label: t('admin.support.filter.inProgress', 'In Progress') },
    { id: 'resolved', label: t('admin.support.filter.resolved', 'Resolved') },
    { id: 'closed', label: t('admin.support.filter.closed', 'Closed') },
  ];

  const priorityFilters = [
    { id: 'all', label: t('admin.support.priority.all', 'All Priorities') },
    { id: 'urgent', label: t('admin.support.priority.urgent', 'Urgent') },
    { id: 'high', label: t('admin.support.priority.high', 'High') },
    { id: 'medium', label: t('admin.support.priority.medium', 'Medium') },
    { id: 'low', label: t('admin.support.priority.low', 'Low') },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {t('admin.support.loading', 'Loading dashboard...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.title, { textAlign }]}>
            {t('admin.support.title', 'Support Dashboard')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.support.subtitle', 'Manage customer support tickets')}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard
            label={t('admin.support.stats.total', 'Total')}
            value={stats.total}
            color={colors.text}
          />
          <StatCard
            label={t('admin.support.stats.open', 'Open')}
            value={stats.open}
            color={colors.warning}
          />
          <StatCard
            label={t('admin.support.stats.inProgress', 'In Progress')}
            value={stats.in_progress}
            color={colors.primary}
          />
          <StatCard
            label={t('admin.support.stats.resolved', 'Resolved')}
            value={stats.resolved}
            color={colors.success}
          />
          <StatCard
            label={t('admin.support.stats.highPriority', 'High Priority')}
            value={stats.high_priority}
            color={colors.error}
          />
        </ScrollView>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {statusFilters.map((f) => (
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
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {priorityFilters.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setPriorityFilter(f.id)}
              style={[
                styles.filterButton,
                styles.filterButtonSmall,
                priorityFilter === f.id && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  priorityFilter === f.id && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryButtonText}>
              {t('common.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tickets List */}
      <ScrollView
        style={styles.ticketsList}
        contentContainerStyle={styles.ticketsContent}
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
              {t('admin.support.empty', 'No tickets match your filters')}
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => (
            <SupportTicketCard
              key={ticket.id}
              ticket={ticket}
              onPress={() => handleTicketSelect(ticket)}
            />
          ))
        )}
      </ScrollView>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <SupportTicketDetail
          ticket={selectedTicket}
          onClose={handleTicketClose}
          onUpdate={handleTicketUpdate}
        />
      )}
    </View>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <GlassView style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </GlassView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: isTV ? 32 : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsScroll: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    marginBottom: spacing.md,
  },
  statsContent: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  statCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    minWidth: isTV ? 140 : 120,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isTV ? 32 : 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filtersContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  ticketsList: {
    flex: 1,
  },
  ticketsContent: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
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
    margin: isTV ? spacing.xl : spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
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
});

export default SupportDashboardScreen;
