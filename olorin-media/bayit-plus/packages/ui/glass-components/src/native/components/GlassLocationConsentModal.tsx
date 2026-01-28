/**
 * GlassLocationConsentModal Component
 *
 * GDPR-compliant location tracking consent modal with:
 * - Clear explanation of data usage
 * - Explicit consent buttons
 * - Privacy-first design
 * - Full accessibility support
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassModal, ModalButton } from './GlassModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface GlassLocationConsentModalProps {
  /** Modal visibility */
  visible: boolean;

  /** Callbacks */
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;

  /** Customization */
  title?: string;
  description?: string;
  acceptButtonText?: string;
  declineButtonText?: string;

  /** i18n keys for translations */
  titleKey?: string;
  descriptionKey?: string;

  /** Testing */
  testID?: string;
}

export const GlassLocationConsentModal: React.FC<GlassLocationConsentModalProps> = ({
  visible,
  onAccept,
  onDecline,
  onClose,
  title = 'Enable Location Services',
  description,
  acceptButtonText = 'Allow Location Access',
  declineButtonText = 'Not Now',
  testID = 'location-consent-modal',
}) => {
  const defaultDescription = `We'd like to show you content relevant to your area.\n\nWe will:\n• Detect your city and state\n• Show local Israeli community content\n• Cache your location for 24 hours\n\nWe will NOT:\n• Track your exact location\n• Share your location with third parties\n• Store your location permanently without consent\n\nYou can change this anytime in settings.`;

  const buttons: ModalButton[] = [
    {
      text: acceptButtonText,
      onPress: onAccept,
      style: 'default',
    },
    {
      text: declineButtonText,
      onPress: onDecline,
      style: 'cancel',
    },
  ];

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={title}
      size="lg"
      buttons={buttons}
      dismissable={true}
      testID={testID}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon} accessibilityLabel="Location pin icon">
            📍
          </Text>
        </View>

        <Text
          style={styles.description}
          accessibilityRole="text"
          accessibilityLabel="Location consent explanation"
        >
          {description || defaultDescription}
        </Text>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Your privacy is important. Location data is encrypted and never sold.
          </Text>
        </View>
      </ScrollView>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 400,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 64,
    lineHeight: 72,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  privacyText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
