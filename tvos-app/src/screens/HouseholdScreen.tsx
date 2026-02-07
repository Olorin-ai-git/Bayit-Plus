/**
 * Household Screen - tvOS (Apple TV)
 * 10-foot UI optimized household management for Apple TV.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TVFocusGuideView } from 'react-native';
import { GlassModal, GlassView, GlassButton } from '@bayit/glass';
import { useTranslation } from 'react-i18next';
import { useHouseholdStore, HouseholdRole } from '../../../shared/stores/householdStore';
import { setApiClient } from '../../../shared/services/householdApi';
import api from '../services/api';
import { styles } from './styles/HouseholdScreen.styles';
import { CreateHouseholdForm } from '../components/household/CreateHouseholdForm';
import { HouseholdDetails } from '../components/household/HouseholdDetails';

setApiClient(api);

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const {
    household, loading, error,
    loadHousehold, createHousehold, inviteMember, removeMember, deleteHousehold, clearError,
  } = useHouseholdStore();

  const [confirmAction, setConfirmAction] = useState<{
    type: 'removeMember' | 'deleteHousehold';
    id?: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => { loadHousehold(); }, [loadHousehold]);

  const handleRemoveMember = (userId: string) => {
    setConfirmAction({
      type: 'removeMember', id: userId,
      title: t('household.removeMember'), message: t('household.confirmRemoveMember'),
    });
  };

  const handleDeleteHousehold = () => {
    setConfirmAction({
      type: 'deleteHousehold',
      title: t('household.delete'), message: t('household.confirmDelete'),
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'removeMember' && confirmAction.id) {
        await removeMember(confirmAction.id);
      } else if (confirmAction.type === 'deleteHousehold') {
        await deleteHousehold();
      }
    } catch (_err) {
      // Error handled by store
    } finally {
      setConfirmAction(null);
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
          <View style={styles.header}>
            <Text style={styles.title}>{t('household.title')}</Text>
            <Text style={styles.subtitle}>{t('household.subtitle')}</Text>
          </View>

          {error && (
            <GlassView style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <GlassButton onPress={clearError} variant="secondary" style={styles.dismissButton}>
                {t('common.dismiss')}
              </GlassButton>
            </GlassView>
          )}

          {!household && (
            <CreateHouseholdForm loading={loading} onCreateHousehold={createHousehold} />
          )}

          {household && (
            <>
              <HouseholdDetails
                household={household}
                loading={loading}
                onInviteMember={inviteMember}
                onRemoveMember={handleRemoveMember}
                onDeleteHousehold={handleDeleteHousehold}
              />
            </>
          )}

          <GlassModal visible={!!confirmAction} onClose={() => setConfirmAction(null)}>
            <View style={styles.confirmContent}>
              <Text style={styles.confirmTitle}>{confirmAction?.title}</Text>
              <Text style={styles.confirmMessage}>{confirmAction?.message}</Text>
              <View style={styles.buttonRow}>
                <GlassButton
                  onPress={handleConfirmAction}
                  variant="destructive"
                  style={styles.button}
                  hasTVPreferredFocus
                >
                  {confirmAction?.type === 'removeMember'
                    ? t('household.remove')
                    : t('household.delete')}
                </GlassButton>
                <GlassButton
                  onPress={() => setConfirmAction(null)}
                  variant="secondary"
                  style={styles.button}
                >
                  {t('common.cancel')}
                </GlassButton>
              </View>
            </View>
          </GlassModal>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </TVFocusGuideView>
    </SafeAreaView>
  );
}
