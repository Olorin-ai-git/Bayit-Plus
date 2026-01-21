/**
 * HelpModal - Full-screen modal for detailed feature explanations
 * Used for comprehensive help content with images, steps, and related articles
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface HelpStep {
  titleKey: string;
  descriptionKey: string;
  imageUrl?: string;
}

interface RelatedArticle {
  titleKey: string;
  slug: string;
}

interface HelpModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** i18n key for the modal title */
  titleKey: string;
  /** i18n key for the main description */
  descriptionKey: string;
  /** Optional feature icon */
  icon?: string;
  /** Step-by-step instructions */
  steps?: HelpStep[];
  /** Related documentation articles */
  relatedArticles?: RelatedArticle[];
  /** Callback when a related article is pressed */
  onArticlePress?: (slug: string) => void;
  /** Callback when user wants to contact support */
  onContactSupport?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  visible,
  onClose,
  titleKey,
  descriptionKey,
  icon,
  steps = [],
  relatedArticles = [],
  onArticlePress,
  onContactSupport,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [fadeAnim, slideAnim, onClose]);

  const handleArticlePress = useCallback((slug: string) => {
    if (onArticlePress) {
      onArticlePress(slug);
    }
    handleClose();
  }, [onArticlePress, handleClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.titleContainer, { flexDirection }]}>
              {icon && <Text style={styles.icon}>{icon}</Text>}
              <Text style={[styles.title, { textAlign }]}>{t(titleKey)}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Description */}
            <Text style={[styles.description, { textAlign }]}>
              {t(descriptionKey)}
            </Text>

            {/* Steps */}
            {steps.length > 0 && (
              <View style={styles.stepsContainer}>
                <Text style={[styles.sectionTitle, { textAlign }]}>
                  {t('help.howTo', 'How to use')}
                </Text>
                {steps.map((step, index) => (
                  <View key={index} style={[styles.step, { flexDirection }]}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { textAlign }]}>
                        {t(step.titleKey)}
                      </Text>
                      <Text style={[styles.stepDescription, { textAlign }]}>
                        {t(step.descriptionKey)}
                      </Text>
                      {step.imageUrl && (
                        <Image
                          source={{ uri: step.imageUrl }}
                          style={styles.stepImage}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <View style={styles.relatedContainer}>
                <Text style={[styles.sectionTitle, { textAlign }]}>
                  {t('help.relatedArticles', 'Related articles')}
                </Text>
                {relatedArticles.map((article, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.relatedItem, { flexDirection }]}
                    onPress={() => handleArticlePress(article.slug)}
                  >
                    <Text style={styles.relatedIcon}>📄</Text>
                    <Text style={[styles.relatedTitle, { textAlign }]}>
                      {t(article.titleKey)}
                    </Text>
                    <Text style={styles.relatedArrow}>
                      {isRTL ? '←' : '→'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Contact Support */}
            {onContactSupport && (
              <View style={styles.supportContainer}>
                <Text style={[styles.supportText, { textAlign }]}>
                  {t('help.stillNeedHelp', 'Still need help?')}
                </Text>
                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={onContactSupport}
                >
                  <Text style={styles.supportButtonText}>
                    {t('help.contactSupport', 'Contact Support')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: isTV ? 32 : 28,
  },
  title: {
    fontSize: isTV ? 24 : 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 26 : 22,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    marginBottom: spacing.xl,
  },
  step: {
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: isTV ? 36 : 28,
    height: isTV ? 36 : 28,
    borderRadius: isTV ? 18 : 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '700',
    color: colors.text,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: isTV ? 14 : 13,
    color: colors.textSecondary,
    lineHeight: isTV ? 22 : 20,
  },
  stepImage: {
    width: '100%',
    height: 150,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  relatedContainer: {
    marginBottom: spacing.xl,
  },
  relatedItem: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  relatedIcon: {
    fontSize: isTV ? 18 : 16,
  },
  relatedTitle: {
    flex: 1,
    fontSize: isTV ? 14 : 13,
    color: colors.text,
  },
  relatedArrow: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  supportContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
  },
  supportText: {
    fontSize: isTV ? 14 : 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  supportButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  supportButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
});

export default HelpModal;
