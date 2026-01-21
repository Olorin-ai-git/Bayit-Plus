import React from 'react';
import {
  View,
  Text,
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
        <View className="flex-1 bg-black/70 justify-center items-center p-4">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className={`w-full max-w-[500px] rounded-lg overflow-hidden border border-white/20 ${isRTL ? 'rtl' : ''}`}>
              {/* Glass background with gradient */}
              <LinearGradient
                colors={['rgba(26, 26, 46, 0.95)', 'rgba(20, 20, 35, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-1"
              >
                {/* Header with accent bar */}
                <View
                  className="flex-row items-center px-5 py-4 border-t-4 border-b bg-yellow-500/10"
                  style={{ borderTopColor: colors.warning, borderBottomColor: colors.glassBorder, borderBottomWidth: 1 }}
                >
                  <Text className="text-2xl mr-4">🔐</Text>
                  <Text className={`text-lg font-semibold flex-1 ${isRTL ? 'text-right' : ''}`} style={{ color: colors.warning }}>
                    {t('subscription.required', 'Subscription Required')}
                  </Text>
                </View>

                {/* Content */}
                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Content title and message */}
                  <View className={`mb-6 ${isRTL ? 'items-end' : ''}`}>
                    <Text className={`text-base font-semibold text-white mb-2 ${isRTL ? 'text-right' : ''}`}>
                      {contentTitle}
                    </Text>
                    <Text className={`text-sm text-gray-400 ${isRTL ? 'text-right' : ''}`} style={{ lineHeight: 20 }}>
                      {contentMessage}
                    </Text>
                  </View>

                  {/* Tier info card */}
                  <View className={`bg-green-500/15 rounded-md border border-green-500 p-4 mb-6 ${isRTL ? 'items-end' : ''}`}>
                    <View className="flex-row items-center mb-4">
                      <Text className="text-xl mr-2">💎</Text>
                      <Text className={`text-base font-semibold ${isRTL ? 'text-right' : ''}`} style={{ color: colors.success }}>
                        {tierInfo.name}
                      </Text>
                    </View>

                    {/* Features list */}
                    <View className="gap-2">
                      {tierInfo.features.map((feature, index) => (
                        <View key={index} className={`flex-row items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Text className="text-sm font-semibold mr-2" style={{ color: colors.success }}>✓</Text>
                          <Text className={`text-sm text-white flex-1 ${isRTL ? 'text-right' : ''}`} style={{ lineHeight: 18 }}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Info message */}
                  <View className={`bg-blue-500/10 rounded-md px-4 py-4 flex-row items-start gap-4 ${isRTL ? 'flex-row-reverse border-r-[3px]' : 'border-l-[3px]'}`} style={{ borderLeftColor: isRTL ? undefined : colors.primary, borderRightColor: isRTL ? colors.primary : undefined }}>
                    <Text className="text-lg" style={{ marginTop: 2 }}>ℹ️</Text>
                    <Text className={`text-sm text-gray-400 flex-1 ${isRTL ? 'text-right' : ''}`} style={{ lineHeight: 18 }}>
                      {t('subscription.upgradeInfo', 'Upgrade your subscription to access premium content')}
                    </Text>
                  </View>
                </ScrollView>

                {/* Buttons */}
                <View className={`flex-row gap-4 px-5 py-5 border-t ${isRTL ? 'flex-row-reverse' : ''}`} style={{ borderTopColor: colors.glassBorder }}>
                  <TouchableOpacity
                    className="flex-1 py-4 rounded-md border justify-center items-center"
                    style={{ borderColor: colors.glassBorder }}
                    onPress={handleBackdropPress}
                  >
                    <Text className={`text-base font-semibold text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 rounded-md overflow-hidden"
                    onPress={handleUpgradePress}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-4 justify-center items-center"
                    >
                      <Text className={`text-base font-semibold text-black ${isRTL ? 'text-right' : ''}`}>
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

export default SubscriptionGateModal;
