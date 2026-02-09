/**
 * Watch Party Screen - Lobby for creating/joining watch parties
 *
 * Features:
 * - Create new party (select content, set room name)
 * - Join existing party via room code
 * - View active/recent parties
 * - Navigate to active party session
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { partyService } from '@bayit/shared-services/api';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassModal,
  GlassErrorBanner,
  GlassBadge,
  colors,
  spacing,
  borderRadius,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';

const log = logger.scope('WatchPartyScreen');

interface Party {
  id: string;
  room_code: string;
  content_title?: string;
  content_type?: string;
  participant_count: number;
  status: 'active' | 'ended' | 'waiting';
  created_at: string;
  host_name?: string;
}

export const WatchPartyScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const response = await partyService.getMyParties() as { parties: Party[] };
      setParties(response.parties || []);
    } catch (err) {
      log.error('Failed to load parties', err);
      setError(t('watchParty.error.loadFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadParties();
  }, [loadParties]);

  const handleJoinByCode = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;

    setIsJoining(true);
    setError(null);

    try {
      const response = await partyService.joinByCode(code) as { party_id: string };
      setShowJoinModal(false);
      setJoinCode('');
      log.info('Joined party by code');
      navigation.navigate('ActiveParty' as never, { partyId: response.party_id } as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('watchParty.error.joinFailed');
      setError(message);
      log.error('Failed to join party', err);
    } finally {
      setIsJoining(false);
    }
  }, [joinCode, navigation, t]);

  const handlePartyPress = useCallback((party: Party) => {
    if (party.status === 'active') {
      navigation.navigate('ActiveParty' as never, { partyId: party.id } as never);
    }
  }, [navigation]);

  const activeParties = parties.filter((p) => p.status === 'active');
  const recentParties = parties.filter((p) => p.status === 'ended');

  const renderPartyItem = useCallback(({ item }: { item: Party }) => (
    <GlassCard
      style={styles.partyCard}
      onPress={() => handlePartyPress(item)}
    >
      <View style={styles.partyHeader}>
        <Text style={styles.partyTitle} numberOfLines={1}>
          {item.content_title || t('watchParty.untitled')}
        </Text>
        <GlassBadge
          variant={item.status === 'active' ? 'success' : 'default'}
          size="sm"
        >
          {item.status === 'active' ? t('watchParty.status.live') : t('watchParty.status.ended')}
        </GlassBadge>
      </View>

      <View style={styles.partyDetails}>
        <Text style={styles.partyDetail}>
          {t('watchParty.participants', { count: item.participant_count })}
        </Text>
        <Text style={styles.partyDetail}>
          {t('watchParty.code')}: {item.room_code}
        </Text>
      </View>

      {item.host_name && (
        <Text style={styles.partyHost}>
          {t('watchParty.hostedBy', { name: item.host_name })}
        </Text>
      )}
    </GlassCard>
  ), [handlePartyPress, t]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <Text style={styles.screenTitle}>{t('watchParty.title')}</Text>
      <Text style={styles.screenSubtitle}>{t('watchParty.subtitle')}</Text>

      {error && (
        <GlassErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <GlassButton
          variant="primary"
          size="large"
          onPress={() => setShowCreateModal(true)}
          style={styles.actionButton}
        >
          {t('watchParty.createParty')}
        </GlassButton>

        <GlassButton
          variant="secondary"
          size="large"
          onPress={() => setShowJoinModal(true)}
          style={styles.actionButton}
        >
          {t('watchParty.joinParty')}
        </GlassButton>
      </View>

      {/* Active Parties */}
      {activeParties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('watchParty.activeParties')}</Text>
          {activeParties.map((party) => (
            <View key={party.id}>
              {renderPartyItem({ item: party })}
            </View>
          ))}
        </View>
      )}

      {/* Recent Parties */}
      {recentParties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('watchParty.recentParties')}</Text>
          {recentParties.map((party) => (
            <View key={party.id}>
              {renderPartyItem({ item: party })}
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {parties.length === 0 && (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('watchParty.empty.title')}</Text>
          <Text style={styles.emptyMessage}>{t('watchParty.empty.message')}</Text>
        </GlassCard>
      )}

      {/* Join Modal */}
      <GlassModal
        visible={showJoinModal}
        onClose={() => { setShowJoinModal(false); setJoinCode(''); }}
        title={t('watchParty.joinParty')}
      >
        <Text style={styles.modalDescription}>{t('watchParty.enterCode')}</Text>
        <GlassInput
          placeholder={t('watchParty.codePlaceholder')}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          maxLength={8}
          editable={!isJoining}
        />
        <View style={styles.modalActions}>
          <GlassButton
            variant="secondary"
            onPress={() => { setShowJoinModal(false); setJoinCode(''); }}
            style={styles.modalButton}
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={handleJoinByCode}
            disabled={joinCode.trim().length < 4 || isJoining}
            style={styles.modalButton}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              t('watchParty.join')
            )}
          </GlassButton>
        </View>
      </GlassModal>

      {/* Create Modal - placeholder for content selection flow */}
      <GlassModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('watchParty.createParty')}
      >
        <Text style={styles.modalDescription}>{t('watchParty.selectContent')}</Text>
        <Text style={styles.comingSoon}>{t('watchParty.contentPickerComingSoon')}</Text>
        <GlassButton
          variant="secondary"
          onPress={() => setShowCreateModal(false)}
        >
          {t('common.close')}
        </GlassButton>
      </GlassModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  partyCard: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  partyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  partyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  partyDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  partyDetail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  partyHost: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  comingSoon: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.xl,
    fontStyle: 'italic',
  },
});
