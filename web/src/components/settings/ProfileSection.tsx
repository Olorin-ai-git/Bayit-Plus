/**
 * ProfileSection
 * User profile settings: avatar, display name, email, phone, account actions.
 */

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import { GlassButton, GlassModal } from '@bayit/shared/ui';
import { User, Camera, Mail, Phone, Trash2 } from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import api from '@/services/api';
import logger from '@/utils/logger';

export function ProfileSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/users/me');
      useAuthStore.getState().logout();
    } catch (error) {
      logger.error('Failed to delete account', 'ProfileSection', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <SettingSection title={t('settings.profile', 'Profile')} isRTL={isRTL}>
        <SettingRow
          type="navigation"
          icon={User}
          label={t('settings.displayName', 'Display Name')}
          value={user?.displayName ?? ''}
          onPress={() => {}}
          isRTL={isRTL}
        />
        <SettingRow
          type="value"
          icon={Mail}
          label={t('settings.email', 'Email')}
          value={user?.email ?? ''}
          isRTL={isRTL}
        />
        <SettingRow
          type="navigation"
          icon={Phone}
          label={t('settings.phoneNumber', 'Phone Number')}
          value={user?.phoneNumber ?? t('settings.notSet', 'Not set')}
          onPress={() => {}}
          isRTL={isRTL}
        />
        <View style={styles.dangerZone}>
          <GlassButton
            variant="destructive"
            size="sm"
            onPress={() => setShowDeleteModal(true)}
          >
            <Trash2 size={14} color={colors.error.DEFAULT} />
            <Text style={styles.deleteText}>
              {t('settings.deleteAccount', 'Delete Account')}
            </Text>
          </GlassButton>
        </View>
      </SettingSection>

      <GlassModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountTitle', 'Delete Account')}
        type="danger"
        buttons={[
          { label: t('common.cancel', 'Cancel'), onPress: () => setShowDeleteModal(false) },
          {
            label: isDeleting
              ? t('common.deleting', 'Deleting...')
              : t('common.delete', 'Delete'),
            onPress: handleDeleteAccount,
            variant: 'destructive',
            disabled: isDeleting,
          },
        ]}
      >
        <Text style={styles.modalText}>
          {t('settings.deleteAccountWarning', 'This action cannot be undone. All your data will be permanently deleted.')}
        </Text>
      </GlassModal>
    </>
  );
}

const styles = StyleSheet.create({
  dangerZone: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteText: {
    color: colors.error.DEFAULT,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  modalText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
