/**
 * Premium Features Showcase
 * Container component showcasing AI-powered premium features with video and interactive widget demo
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Maximize2 } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { config } from '@bayit/shared-config/appConfig';
import { WidgetsIntroVideo } from '@bayit/shared/widgets/WidgetsIntroVideo';
import { VideoShowcaseCard } from './VideoShowcaseCard';
import { WidgetDemoCard } from './WidgetDemoCard';
import { PremiumFeatureCard } from './PremiumFeatureCard';

export const PremiumFeaturesShowcase: React.FC = () => {
  const { t } = useTranslation();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const premiumFeatures = [
    {
      icon: <Sparkles size={32} color="#ffffff" />,
      title: sanitizeI18n(t('subscribe.premiumShowcase.aiAssistant.title')),
      description: sanitizeI18n(
        t('subscribe.premiumShowcase.aiAssistant.description')
      ),
    },
    {
      icon: <Maximize2 size={32} color="#ffffff" />,
      title: sanitizeI18n(
        t('subscribe.premiumShowcase.floatingWidgets.title')
      ),
      description: sanitizeI18n(
        t('subscribe.premiumShowcase.floatingWidgets.description')
      ),
    },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      // @ts-ignore - data-testid for Playwright testing
      data-testid="premium-showcase"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {sanitizeI18n(t('subscribe.premiumShowcase.title'))}
        </Text>
        <Text style={styles.subtitle}>
          {sanitizeI18n(t('subscribe.premiumShowcase.subtitle'))}
        </Text>
      </View>

      {/* Showcase Grid */}
      <View style={[styles.showcaseGrid, isMobile && styles.showcaseGridMobile]}>
        <VideoShowcaseCard
          title={sanitizeI18n(t('subscribe.premiumShowcase.videoTitle'))}
          description={sanitizeI18n(
            t('subscribe.premiumShowcase.videoDescription')
          )}
          onPlay={() => setShowVideoModal(true)}
        />
        <WidgetDemoCard
          title={sanitizeI18n(t('subscribe.premiumShowcase.widgetTitle'))}
          description={sanitizeI18n(
            t('subscribe.premiumShowcase.widgetDescription')
          )}
        />
      </View>

      {/* Feature Highlights */}
      <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
        {premiumFeatures.map((feature, index) => (
          <Animated.View
            key={index}
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: Animated.add(
                    slideAnim,
                    new Animated.Value(index * 5)
                  ),
                },
              ],
            }}
          >
            <PremiumFeatureCard
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          </Animated.View>
        ))}
      </View>

      {/* Video Modal */}
      <WidgetsIntroVideo
        visible={showVideoModal}
        videoUrl={config.media.widgetsIntroVideo}
        onComplete={() => setShowVideoModal(false)}
        onDismiss={() => setShowVideoModal(false)}
        autoPlay={true}
        showDismissButton={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.xl * 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: 600,
    textAlign: 'center',
    lineHeight: 24,
  },
  showcaseGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  showcaseGridMobile: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  featuresGridMobile: {
    flexDirection: 'column',
    gap: spacing.md,
  },
});
