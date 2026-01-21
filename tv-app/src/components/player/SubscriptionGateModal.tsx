import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

export interface SubscriptionGateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  requiredTier?: 'basic' | 'premium' | 'family';
  contentTitle?: string;
  contentType?: 'vod' | 'live' | 'radio' | 'podcast';
}

const getTierInfo = (tier: string | undefined) => {
  const tierMap: Record<string, { name: string; features: string[] }> = {
    basic: {
      name: 'Basic',
      features: ['Limited VOD content', 'Ad-supported', 'SD quality'],
    },
    premium: {
      name: 'Premium',
      features: ['All VOD content', 'Ad-free', 'HD/4K quality', 'Live TV access'],
    },
    family: {
      name: 'Family',
      features: ['All Premium features', 'Up to 4 profiles', 'Multi-device streaming', 'Kids profiles'],
    },
  };
  return tierMap[tier || 'premium'] || tierMap.premium;
};

const getContentMessage = (contentType: string | undefined): string => {
  switch (contentType) {
    case 'live':
      return 'requires Premium or Family subscription';
    case 'radio':
      return 'requires Premium or Family subscription';
    case 'podcast':
      return 'is available with Premium or Family subscription';
    default:
      return 'requires a paid subscription';
  }
};

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  requiredTier = 'premium',
  contentTitle = 'This content',
  contentType = 'vod',
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const tierInfo = getTierInfo(requiredTier);
  const contentMessage = getContentMessage(contentType);

  const handleBackdropPress = () => {
    onClose();
  };

  const handleUpgradePress = () => {
    onUpgrade();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContainer, isRTL && styles.modalContainerRTL]}>
              {/* Glass background with gradient */}
              <LinearGradient
                colors={['rgba(26, 26, 46, 0.95)', 'rgba(20, 20, 35, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              >
                {/* Header with accent bar */}
                <View
                  style={[styles.header, { borderTopColor: colors.warning }]}
                >
                  <Text style={styles.headerIcon}>🔐</Text>
                  <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                    {t('subscription.required', 'Subscription Required')}
                  </Text>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Content title and message */}
                  <View style={[styles.messageSection, isRTL && styles.messageRTL]}>
                    <Text style={[styles.contentTitle, isRTL && styles.textRTL]}>
                      {contentTitle}
                    </Text>
                    <Text style={[styles.message, isRTL && styles.textRTL]}>
                      {contentMessage}
                    </Text>
                  </View>

                  {/* Tier info card */}
                  <View style={[styles.tierCard, isRTL && styles.tierCardRTL]}>
                    <View style={styles.tierHeader}>
                      <Text style={styles.tierIcon}>💎</Text>
                      <Text style={[styles.tierName, isRTL && styles.textRTL]}>
                        {tierInfo.name}
                      </Text>
                    </View>

                    {/* Features list */}
                    <View style={styles.featuresList}>
                      {tierInfo.features.map((feature, index) => (
                        <View key={index} style={[styles.featureItem, isRTL && styles.featureItemRTL]}>
                          <Text style={styles.featureBullet}>✓</Text>
                          <Text style={[styles.featureText, isRTL && styles.textRTL]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Info message */}
                  <View style={[styles.infoBox, isRTL && styles.infoBoxRTL]}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                      {t('subscription.upgradeInfo', 'Upgrade your subscription to access premium content')}
                    </Text>
                  </View>
                </ScrollView>

                {/* Buttons */}
                <View style={[styles.footer, isRTL && styles.footerRTL]}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleBackdropPress}
                  >
                    <Text style={[styles.cancelButtonText, isRTL && styles.textRTL]}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={handleUpgradePress}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.upgradeGradient}
                    >
                      <Text style={[styles.upgradeButtonText, isRTL && styles.textRTL]}>
                        {t('subscription.upgrade', 'Upgrade Now')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalContainerRTL: {
    direction: 'rtl',
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.warning,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  messageSection: {
    marginBottom: spacing.lg,
  },
  messageRTL: {
    alignItems: 'flex-end',
  },
  contentTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tierCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tierCardRTL: {
    alignItems: 'flex-end',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tierIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  tierName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureItemRTL: {
    flexDirection: 'row-reverse',
  },
  featureBullet: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginRight: spacing.sm,
    fontWeight: '600',
  },
  featureText: {
    fontSize: fontSize.sm,
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoBoxRTL: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
    flexDirection: 'row-reverse',
  },
  infoIcon: {
    fontSize: 18,
    marginTop: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  upgradeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  upgradeGradient: {
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#000000',
  },
});

export default SubscriptionGateModal;
