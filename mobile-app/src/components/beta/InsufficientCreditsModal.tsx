/**
 * Insufficient Credits Modal - Mobile (iOS/Android)
 *
 * Shown when a user attempts a Beta 500 feature without enough credits.
 * Uses SafeAreaView, TouchableOpacity, and StyleSheet for mobile.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';

export interface InsufficientCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  requiredCredits: number;
  currentBalance: number;
  featureName: string;
  onUpgrade?: () => void;
  onViewProfile?: () => void;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  visible,
  onClose,
  requiredCredits,
  currentBalance,
  featureName,
  onUpgrade,
  onViewProfile,
}) => {
  const { t } = useTranslation();
  const deficit = requiredCredits - currentBalance;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.warningBadge}>
              <Text style={styles.warningIcon}>!</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('beta.insufficientCredits.title')}</Text>
              <Text style={styles.subtitle}>{t('beta.insufficientCredits.subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeIcon}>x</Text>
            </TouchableOpacity>
          </View>

          {/* Credit Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.featureText}>
              {t('beta.insufficientCredits.featureRequires', { feature: featureName })}
            </Text>

            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>{t('beta.insufficientCredits.required')}:</Text>
              <Text style={styles.creditValueWhite}>{requiredCredits} credits</Text>
            </View>

            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>{t('beta.insufficientCredits.yourBalance')}:</Text>
              <Text style={styles.creditValueRed}>{currentBalance} credits</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>{t('beta.insufficientCredits.needMore')}:</Text>
              <Text style={styles.creditValueOrange}>{deficit} credits</Text>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('beta.insufficientCredits.whatAreCredits')}</Text>
            <Text style={styles.infoText}>{t('beta.insufficientCredits.creditsExplanation')}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {onUpgrade && (
              <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade} activeOpacity={0.8}>
                <Text style={styles.upgradeButtonText}>
                  {t('beta.insufficientCredits.upgradeButton')}
                </Text>
              </TouchableOpacity>
            )}

            {onViewProfile && (
              <TouchableOpacity style={styles.secondaryButton} onPress={onViewProfile} activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>
                  {t('beta.insufficientCredits.viewProfileButton')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>
                {t('beta.insufficientCredits.cancelButton')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>{t('beta.insufficientCredits.helpText')}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(20, 20, 30, 0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  warningBadge: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIcon: { fontSize: 20, fontWeight: 'bold', color: '#FCA5A5' },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 13, color: '#FCA5A5', marginTop: 2 },
  closeIcon: { fontSize: 18, color: 'rgba(255,255,255,0.5)', padding: 4 },
  detailsCard: {
    margin: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: spacing[3] },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  creditLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  creditValueWhite: { fontSize: 16, fontWeight: '600', color: colors.white },
  creditValueRed: { fontSize: 16, fontWeight: '600', color: '#FCA5A5' },
  creditValueOrange: { fontSize: 16, fontWeight: 'bold', color: '#FDBA74' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing[2] },
  infoBox: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 14,
    padding: spacing[4],
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#93C5FD', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#93C5FD', lineHeight: 20 },
  actions: { paddingHorizontal: spacing[4], gap: spacing[3] },
  upgradeButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: spacing[3],
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing[3],
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: { paddingVertical: spacing[3], alignItems: 'center' },
  upgradeButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  secondaryButtonText: { fontSize: 15, fontWeight: '500', color: colors.white },
  cancelButtonText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    padding: spacing[4],
  },
});

export default InsufficientCreditsModal;
