/**
 * HouseholdDetails - Household members and invitations display for tvOS
 */

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { GlassView, GlassButton } from '@bayit/glass';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { HouseholdRole } from '../../../../shared/stores/householdStore';
import { styles } from '../../screens/styles/HouseholdScreen.styles';

interface HouseholdMember {
  user_id: string;
  role: HouseholdRole;
}

interface PendingInvitation {
  invitation_id: string;
  email: string;
  role: HouseholdRole;
  expires_at: string;
}

interface HouseholdData {
  name: string;
  owner_id: string;
  members: HouseholdMember[];
  pending_invitations: PendingInvitation[];
}

interface HouseholdDetailsProps {
  household: HouseholdData;
  loading: boolean;
  onInviteMember: (email: string, role: HouseholdRole) => Promise<void>;
  onRemoveMember: (userId: string) => void;
  onDeleteHousehold: () => void;
}

function getRoleDisplay(role: HouseholdRole, t: (key: string) => string) {
  switch (role) {
    case HouseholdRole.PARENT: return t('household.roleParent');
    case HouseholdRole.CHILD: return t('household.roleChild');
    case HouseholdRole.GUARDIAN: return t('household.roleGuardian');
    default: return role;
  }
}

export function HouseholdDetails({
  household, loading, onInviteMember, onRemoveMember, onDeleteHousehold,
}: HouseholdDetailsProps) {
  const { t } = useTranslation();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole] = useState<HouseholdRole>(HouseholdRole.CHILD);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (_err) {
      // Error handled by store
    }
  };

  return (
    <>
      <GlassView style={styles.section}>
        <View style={styles.householdHeader}>
          <View>
            <Text style={styles.householdName}>{household.name}</Text>
            <Text style={styles.memberCount}>
              {t('household.memberCount', { count: household.members.length })}
            </Text>
          </View>
          <GlassButton onPress={onDeleteHousehold} variant="destructive">
            {t('household.delete')}
          </GlassButton>
        </View>

        <Text style={styles.sectionHeader}>{t('household.members')}</Text>
        {household.members.map((member) => (
          <View key={member.user_id} style={styles.memberCard}>
            <View>
              <Text style={styles.memberName}>{member.user_id}</Text>
              <Text style={styles.memberRole}>{getRoleDisplay(member.role, t)}</Text>
            </View>
            {member.user_id !== household.owner_id && (
              <GlassButton onPress={() => onRemoveMember(member.user_id)} variant="destructive">
                {t('household.remove')}
              </GlassButton>
            )}
          </View>
        ))}

        {household.pending_invitations.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>{t('household.pendingInvitations')}</Text>
            {household.pending_invitations.map((invite) => (
              <View key={invite.invitation_id} style={styles.invitationCard}>
                <Text style={styles.inviteEmail}>{invite.email}</Text>
                <Text style={styles.inviteDetails}>
                  {getRoleDisplay(invite.role, t)} {' '} {t('household.expires')}:{' '}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </>
        )}

        <GlassButton onPress={() => setShowInviteForm(true)} variant="primary" style={styles.inviteButton}>
          {t('household.inviteMember')}
        </GlassButton>
      </GlassView>

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
            <GlassButton onPress={handleInvite} variant="primary" disabled={loading} style={styles.button}>
              {loading ? t('common.sending') : t('household.sendInvitation')}
            </GlassButton>
            <GlassButton
              onPress={() => { setShowInviteForm(false); setInviteEmail(''); }}
              variant="secondary"
              style={styles.button}
            >
              {t('common.cancel')}
            </GlassButton>
          </View>
        </GlassView>
      )}
    </>
  );
}
