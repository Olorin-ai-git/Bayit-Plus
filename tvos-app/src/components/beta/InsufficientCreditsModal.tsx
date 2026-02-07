/**
 * Insufficient Credits Modal - tvOS (10-foot UI)
 *
 * TV-optimized modal for when a user lacks Beta 500 credits.
 * Focus navigation with Pressable buttons for Siri Remote.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassModal } from '@bayit/glass';
import { styles } from './styles/InsufficientCreditsModal.styles';

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
    <GlassModal visible={visible} onClose={onClose} size="lg" type="warning" dismissable>
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
    </GlassModal>
  );
};

export default InsufficientCreditsModal;
