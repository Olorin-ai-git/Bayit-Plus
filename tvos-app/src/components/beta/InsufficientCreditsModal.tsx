/**
 * Insufficient Credits Modal - tvOS (10-foot UI)
 *
 * TV-optimized modal for when a user lacks Beta 500 credits.
 * Focus navigation with Pressable buttons for Siri Remote.
 */

import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
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
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.warningIcon}>!</Text>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('beta.insufficientCredits.title')}</Text>
              <Text style={styles.subtitle}>{t('beta.insufficientCredits.subtitle')}</Text>
            </View>
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
              <Pressable
                onPress={onUpgrade}
                style={({ focused }) => [styles.upgradeButton, focused && styles.buttonFocused]}
                hasTVPreferredFocus
              >
                <Text style={styles.upgradeButtonText}>
                  {t('beta.insufficientCredits.upgradeButton')}
                </Text>
              </Pressable>
            )}

            {onViewProfile && (
              <Pressable
                onPress={onViewProfile}
                style={({ focused }) => [styles.secondaryButton, focused && styles.buttonFocused]}
              >
                <Text style={styles.secondaryButtonText}>
                  {t('beta.insufficientCredits.viewProfileButton')}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              style={({ focused }) => [styles.cancelButton, focused && styles.buttonFocused]}
            >
              <Text style={styles.cancelButtonText}>
                {t('beta.insufficientCredits.cancelButton')}
              </Text>
            </Pressable>
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>{t('beta.insufficientCredits.helpText')}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 720,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[8],
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  warningIcon: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FCA5A5',
    width: 60,
    height: 60,
    lineHeight: 60,
    textAlign: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    overflow: 'hidden',
  },
  headerText: { flex: 1 },
  title: { fontSize: 36, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 24, color: '#FCA5A5', marginTop: 4 },
  detailsCard: {
    margin: spacing[8],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: { fontSize: 26, color: 'rgba(255,255,255,0.8)', marginBottom: spacing[4] },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  creditLabel: { fontSize: 26, color: 'rgba(255,255,255,0.6)' },
  creditValueWhite: { fontSize: 28, fontWeight: '600', color: colors.white },
  creditValueRed: { fontSize: 28, fontWeight: '600', color: '#FCA5A5' },
  creditValueOrange: { fontSize: 28, fontWeight: 'bold', color: '#FDBA74' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing[3] },
  infoBox: {
    marginHorizontal: spacing[8],
    marginBottom: spacing[6],
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    padding: spacing[6],
  },
  infoTitle: { fontSize: 26, fontWeight: '600', color: '#93C5FD', marginBottom: 6 },
  infoText: { fontSize: 24, color: '#93C5FD', lineHeight: 34 },
  actions: { paddingHorizontal: spacing[8], gap: spacing[4] },
  upgradeButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: spacing[5],
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing[5],
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 16,
  },
  buttonFocused: {
    borderColor: '#A855F7',
    transform: [{ scale: 1.03 }],
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  upgradeButtonText: { fontSize: 30, fontWeight: '600', color: colors.white },
  secondaryButtonText: { fontSize: 28, fontWeight: '500', color: colors.white },
  cancelButtonText: { fontSize: 26, color: 'rgba(255, 255, 255, 0.6)' },
  helpText: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    padding: spacing[6],
  },
});

export default InsufficientCreditsModal;
