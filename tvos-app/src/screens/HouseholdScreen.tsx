/**
 * Household Screen - tvOS (Apple TV)
 *
 * 10-foot UI optimized household management for Apple TV.
 * Provides TV-optimized interface for creating households and managing members.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  TVFocusGuideView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassButton } from '@bayit/glass';
import { useHouseholdStore, HouseholdRole } from '../../../shared/stores/householdStore';
import { setApiClient } from '../../../shared/services/householdApi';
import api from '../services/api';

setApiClient(api);

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const {
    household,
    loading,
    error,
    loadHousehold,
    createHousehold,
    inviteMember,
    removeMember,
    deleteHousehold,
    clearError,
  } = useHouseholdStore();

  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<HouseholdRole>(HouseholdRole.CHILD);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) return;

    try {
      await createHousehold(householdName.trim());
      setHouseholdName('');
      setShowCreateForm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleRemoveMember = async (userId: string) => {
    Alert.alert(
      t('household.removeMember'),
      t('household.confirmRemoveMember'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('household.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(userId);
            } catch (error) {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  const handleDeleteHousehold = async () => {
    Alert.alert(
      t('household.delete'),
      t('household.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('household.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHousehold();
            } catch (error) {
              // Error handled by store
            }
          },
        },
      ]
    );
  };

  const getRoleDisplay = (role: HouseholdRole) => {
    switch (role) {
      case HouseholdRole.PARENT:
        return t('household.roleParent');
      case HouseholdRole.CHILD:
        return t('household.roleChild');
      case HouseholdRole.GUARDIAN:
        return t('household.roleGuardian');
      default:
        return role;
    }
  };

  if (loading && !household) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TVFocusGuideView style={styles.focusGuide} autoFocus>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('household.title')}</Text>
            <Text style={styles.subtitle}>{t('household.subtitle')}</Text>
          </View>

          {/* Error Display */}
          {error && (
            <GlassView style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <GlassButton onPress={clearError} variant="secondary" style={styles.dismissButton}>
                {t('common.dismiss')}
              </GlassButton>
            </GlassView>
          )}

          {/* No Household - Create Form */}
          {!household && (
            <GlassView style={styles.section}>
              <Text style={styles.sectionHeader}>{t('household.createHousehold')}</Text>
              <Text style={styles.description}>{t('household.createDescription')}</Text>

              {!showCreateForm ? (
                <GlassButton
                  onPress={() => setShowCreateForm(true)}
                  variant="primary"
                  hasTVPreferredFocus
                >
                  {t('household.createButton')}
                </GlassButton>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={styles.label}>{t('household.householdName')}</Text>
                  <TextInput
                    value={householdName}
                    onChangeText={setHouseholdName}
                    placeholder={t('household.namePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                  <View style={styles.buttonRow}>
                    <GlassButton
                      onPress={handleCreateHousehold}
                      variant="primary"
                      disabled={loading}
                      style={styles.button}
                      hasTVPreferredFocus
                    >
                      {loading ? t('common.creating') : t('household.create')}
                    </GlassButton>
                    <GlassButton
                      onPress={() => {
                        setShowCreateForm(false);
                        setHouseholdName('');
                      }}
                      variant="secondary"
                      style={styles.button}
                    >
                      {t('common.cancel')}
                    </GlassButton>
                  </View>
                </View>
              )}
            </GlassView>
          )}

          {/* Household Details */}
          {household && (
            <>
              <GlassView style={styles.section}>
                <View style={styles.householdHeader}>
                  <View>
                    <Text style={styles.householdName}>{household.name}</Text>
                    <Text style={styles.memberCount}>
                      {t('household.memberCount', { count: household.members.length })}
                    </Text>
                  </View>
                  <GlassButton onPress={handleDeleteHousehold} variant="destructive">
                    {t('household.delete')}
                  </GlassButton>
                </View>

                {/* Members List */}
                <Text style={styles.sectionHeader}>{t('household.members')}</Text>
                {household.members.map((member) => (
                  <View key={member.user_id} style={styles.memberCard}>
                    <View>
                      <Text style={styles.memberName}>{member.user_id}</Text>
                      <Text style={styles.memberRole}>{getRoleDisplay(member.role)}</Text>
                    </View>
                    {member.user_id !== household.owner_id && (
                      <GlassButton
                        onPress={() => handleRemoveMember(member.user_id)}
                        variant="destructive"
                      >
                        {t('household.remove')}
                      </GlassButton>
                    )}
                  </View>
                ))}

                {/* Pending Invitations */}
                {household.pending_invitations.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>{t('household.pendingInvitations')}</Text>
                    {household.pending_invitations.map((invite) => (
                      <View key={invite.invitation_id} style={styles.invitationCard}>
                        <Text style={styles.inviteEmail}>{invite.email}</Text>
                        <Text style={styles.inviteDetails}>
                          {getRoleDisplay(invite.role)} • {t('household.expires')}:{' '}
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Invite Member Button */}
                <GlassButton
                  onPress={() => setShowInviteForm(true)}
                  variant="primary"
                  style={styles.inviteButton}
                >
                  {t('household.inviteMember')}
                </GlassButton>
              </GlassView>

              {/* Invite Form */}
              {showInviteForm && (
                <GlassView style={styles.inviteFormContainer}>
                  <Text style={styles.formHeader}>{t('household.inviteMember')}</Text>
                  <Text style={styles.label}>{t('household.email')}</Text>
                  <TextInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder={t('household.emailPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    style={styles.input}
                  />
                  <View style={styles.buttonRow}>
                    <GlassButton
                      onPress={handleInviteMember}
                      variant="primary"
                      disabled={loading}
                      style={styles.button}
                    >
                      {loading ? t('common.sending') : t('household.sendInvitation')}
                    </GlassButton>
                    <GlassButton
                      onPress={() => {
                        setShowInviteForm(false);
                        setInviteEmail('');
                      }}
                      variant="secondary"
                      style={styles.button}
                    >
                      {t('common.cancel')}
                    </GlassButton>
                  </View>
                </GlassView>
              )}
            </>
          )}

          {/* Bottom Spacing for TV Safe Area */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </TVFocusGuideView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  focusGuide: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: fontSize['4xl'],
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  errorContainer: {
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.lg,
    marginBottom: spacing.md,
  },
  dismissButton: {
    marginTop: spacing.sm,
    minHeight: 60,
  },
  section: {
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
  },
  sectionHeader: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: fontSize.lg * 1.6,
    marginBottom: spacing.lg,
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  formHeader: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glassLight,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    color: colors.text,
    fontSize: fontSize.xl,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 60,
  },
  householdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  householdName: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  memberCount: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  memberName: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  invitationCard: {
    backgroundColor: colors.glassLight,
    borderColor: colors.warning,
    borderWidth: 2,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  inviteEmail: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.text,
  },
  inviteDetails: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  inviteButton: {
    marginTop: spacing.xxl,
    minHeight: 60,
  },
  inviteFormContainer: {
    marginTop: spacing.xxl,
    padding: spacing.xxl,
  },
  bottomSpacing: {
    height: spacing.xxl * 2,
  },
});
