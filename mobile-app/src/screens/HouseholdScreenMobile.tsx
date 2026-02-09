/**
 * Household Screen - Mobile (iOS/Android)
 *
 * Native mobile implementation for household management.
 * Provides UI for creating households, inviting members, managing household.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassButton } from '@bayit/glass';
import { GlassModal } from '@olorin/glass-ui/native';
import { useHouseholdStore, HouseholdRole } from '../../../shared/stores/householdStore';
import { setApiClient } from '../../../shared/services/householdApi';
import api from '../services/api';

setApiClient(api);

export default function HouseholdScreenMobile() {
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
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);

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

  const handleRemoveMember = (userId: string) => {
    setPendingRemoveUserId(userId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (pendingRemoveUserId) {
      try {
        await removeMember(pendingRemoveUserId);
      } catch (_error) {
        // Error handled by store
      }
    }
    setShowRemoveConfirm(false);
    setPendingRemoveUserId(null);
  };

  const handleDeleteHousehold = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHousehold = async () => {
    try {
      await deleteHousehold();
    } catch (_error) {
      // Error handled by store
    }
    setShowDeleteConfirm(false);
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
              <GlassButton onPress={() => setShowCreateForm(true)} variant="primary">
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

            {/* Invite Form Modal */}
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
                {/* Role Selector - Simplified for mobile */}
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
      </ScrollView>

      {/* Remove Member Confirmation Modal */}
      <GlassModal
        visible={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setPendingRemoveUserId(null);
        }}
        size="sm"
        dismissable
      >
        <Text style={styles.modalTitle}>{t('household.removeMember')}</Text>
        <Text style={styles.modalMessage}>{t('household.confirmRemoveMember')}</Text>
        <View style={styles.modalButtonRow}>
          <GlassButton
            variant="secondary"
            onPress={() => {
              setShowRemoveConfirm(false);
              setPendingRemoveUserId(null);
            }}
            style={styles.modalButton}
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="destructive"
            onPress={confirmRemoveMember}
            style={styles.modalButton}
          >
            {t('household.remove')}
          </GlassButton>
        </View>
      </GlassModal>

      {/* Delete Household Confirmation Modal */}
      <GlassModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
        dismissable
      >
        <Text style={styles.modalTitle}>{t('household.delete')}</Text>
        <Text style={styles.modalMessage}>{t('household.confirmDelete')}</Text>
        <View style={styles.modalButtonRow}>
          <GlassButton
            variant="secondary"
            onPress={() => setShowDeleteConfirm(false)}
            style={styles.modalButton}
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="destructive"
            onPress={confirmDeleteHousehold}
            style={styles.modalButton}
          >
            {t('household.delete')}
          </GlassButton>
        </View>
      </GlassModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: fontSize.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  errorContainer: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  dismissButton: {
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.md,
  },
  formContainer: {
    marginTop: spacing.md,
  },
  formHeader: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glassLight,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  householdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  householdName: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  memberCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  invitationCard: {
    backgroundColor: colors.glassLight,
    borderColor: colors.warning,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  inviteEmail: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  inviteDetails: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  inviteButton: {
    marginTop: spacing.lg,
  },
  inviteFormContainer: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: fontSize.md * 1.5,
    marginBottom: spacing.lg,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
