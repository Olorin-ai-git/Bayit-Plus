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
  Modal,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
      <Animated.View className="flex-1 bg-black/70 justify-center items-center p-4" style={{ opacity: fadeAnim }}>
        <Animated.View
          className="w-full max-w-[600px] max-h-[90%] bg-[rgba(25,25,35,0.98)] rounded-2xl border border-white/10 overflow-hidden"
          style={{
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-white/10">
            <View className="flex-1 items-center gap-2" style={{ flexDirection }}>
              {icon && <Text className={isTV ? 'text-[32px]' : 'text-[28px]'}>{icon}</Text>}
              <Text className={`text-white font-bold ${isTV ? 'text-2xl' : 'text-xl'}`} style={{ textAlign }}>{t(titleKey)}</Text>
            </View>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-full bg-white/10"
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Text className="text-white text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="p-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Description */}
            <Text className={`text-white/70 mb-4 ${isTV ? 'text-base leading-[26px]' : 'text-sm leading-[22px]'}`} style={{ textAlign }}>
              {t(descriptionKey)}
            </Text>

            {/* Steps */}
            {steps.length > 0 && (
              <View className="mb-6">
                <Text className={`text-white font-semibold mb-3 ${isTV ? 'text-lg' : 'text-base'}`} style={{ textAlign }}>
                  {t('help.howTo', 'How to use')}
                </Text>
                {steps.map((step, index) => (
                  <View key={index} className="items-start gap-3 mb-4" style={{ flexDirection }}>
                    <View className={`items-center justify-center bg-purple-500 ${isTV ? 'w-9 h-9 rounded-[18px]' : 'w-7 h-7 rounded-[14px]'}`}>
                      <Text className={`text-white font-bold ${isTV ? 'text-base' : 'text-sm'}`}>{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-white font-semibold mb-1 ${isTV ? 'text-base' : 'text-sm'}`} style={{ textAlign }}>
                        {t(step.titleKey)}
                      </Text>
                      <Text className={`text-white/70 ${isTV ? 'text-sm leading-[22px]' : 'text-[13px] leading-5'}`} style={{ textAlign }}>
                        {t(step.descriptionKey)}
                      </Text>
                      {step.imageUrl && (
                        <Image
                          source={{ uri: step.imageUrl }}
                          className="w-full h-[150px] mt-2 rounded-md"
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
              <View className="mb-6">
                <Text className={`text-white font-semibold mb-3 ${isTV ? 'text-lg' : 'text-base'}`} style={{ textAlign }}>
                  {t('help.relatedArticles', 'Related articles')}
                </Text>
                {relatedArticles.map((article, index) => (
                  <TouchableOpacity
                    key={index}
                    className="items-center gap-2 p-3 bg-white/5 rounded-md mb-2"
                    style={{ flexDirection }}
                    onPress={() => handleArticlePress(article.slug)}
                  >
                    <Text className={isTV ? 'text-lg' : 'text-base'}>📄</Text>
                    <Text className={`flex-1 text-white ${isTV ? 'text-sm' : 'text-[13px]'}`} style={{ textAlign }}>
                      {t(article.titleKey)}
                    </Text>
                    <Text className={`text-white/70 ${isTV ? 'text-base' : 'text-sm'}`}>
                      {isRTL ? '←' : '→'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Contact Support */}
            {onContactSupport && (
              <View className="items-center p-4 bg-white/5 rounded-lg">
                <Text className={`text-white/70 mb-3 ${isTV ? 'text-sm' : 'text-[13px]'}`} style={{ textAlign }}>
                  {t('help.stillNeedHelp', 'Still need help?')}
                </Text>
                <TouchableOpacity
                  className={`px-6 bg-purple-500 rounded-lg ${isTV ? 'py-3' : 'py-2'}`}
                  onPress={onContactSupport}
                >
                  <Text className={`text-white font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>
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

export default HelpModal;
