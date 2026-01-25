/**
 * ProfileSelectionScreenMobile - Mobile-optimized Netflix-style profile picker
 *
 * Features:
 * - 2-3 column profile grid
 * - PIN via native keyboard
 * - Biometric auth (Face ID/Touch ID)
 * - RTL support
 * - Haptic feedback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as BiometricAuth from '../utils/biometricAuth';
import { useProfile, Profile } from '@bayit/shared-contexts';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('ProfileSelectionScreenMobile');

const AVATAR_COLORS = [
  '#a855f7',
  '#ff6b6b',
  '#4ecdc4',
  '#ffd93d',
  '#6c5ce7',
  '#a8e6cf',
  '#ff8b94',
  '#ffaaa5',
];

interface ProfileCardProps {
  profile: Profile;
  onSelect: (profile: Profile) => void;
  isSelected: boolean;
  isManageMode: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onSelect,
  isSelected,
  isManageMode,
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onSelect(profile);
  }, [profile, onSelect]);

  return (
    <TouchableOpacity
      className={`items-center w-[100px] ${isSelected ? 'opacity-70' : ''} ${isManageMode ? 'opacity-90' : ''}`}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View
        className="w-20 h-20 rounded-xl justify-center items-center mb-2 border-[3px] border-transparent"
        style={{ backgroundColor: profile.avatar_color || AVATAR_COLORS[0] }}
      >
        {profile.avatar ? (
          <Text className="text-[40px]">{profile.avatar}</Text>
        ) : (
          <Text className="text-[28px] font-bold text-white" style={{ textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{getInitials(profile.name)}</Text>
        )}
        {profile.is_kids_profile && (
          <View className="absolute -bottom-[5px] -right-[5px] bg-[#ffd93d] rounded-xl p-1">
            <Text className="text-[12px]">👶</Text>
          </View>
        )}
        {profile.has_pin && (
          <View className="absolute -top-[5px] -right-[5px] bg-black/60 rounded-[10px] p-1">
            <Text className="text-[10px]">🔒</Text>
          </View>
        )}
      </View>
      <Text className="text-[14px] text-gray-400 text-center max-w-[100px]" numberOfLines={1}>
        {profile.name}
      </Text>
      {isManageMode && (
        <View className="absolute top-0 left-[10px] w-20 h-20 rounded-xl bg-black/50 justify-center items-center">
          <Text className="text-2xl">✏️</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface PinModalProps {
  visible: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  onBiometric: () => void;
  hasBiometric: boolean;
  error?: string;
  isLoading?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  onBiometric,
  hasBiometric,
  error,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { isRTL } = useDirection();

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (pin.length >= 4) {
      ReactNativeHapticFeedback.trigger('impactLight');
      onSubmit(pin);
    }
  }, [pin, onSubmit]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/80 justify-center items-center p-4">
        <View className="w-full max-w-[320px] p-4 rounded-2xl items-center" style={{ backgroundColor: colors.backgroundLight }}>
          <Text className="text-xl font-semibold text-white mb-4">{t('profiles.enterPin', 'Enter PIN')}</Text>

          <TextInput
            ref={inputRef}
            className="w-full h-14 bg-white/10 rounded-lg px-4 text-2xl text-white tracking-[8px] mb-4"
            style={{ textAlign: isRTL ? 'right' : 'center' }}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={handleSubmit}
          />

          {error && <Text className="text-sm text-red-500 mb-4 text-center">{error}</Text>}

          <View className="flex-row gap-2 w-full">
            <TouchableOpacity
              className="flex-1 h-12 justify-center items-center rounded-lg bg-white/10"
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                onCancel();
              }}
            >
              <Text className="text-base text-gray-400">{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>

            {hasBiometric && (
              <TouchableOpacity
                className="w-12 h-12 justify-center items-center rounded-lg bg-purple-600/20"
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight');
                  onBiometric();
                }}
              >
                <Text className="text-2xl">👆</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`flex-1 h-12 justify-center items-center rounded-lg ${pin.length < 4 ? 'opacity-50' : ''}`}
              style={{ backgroundColor: colors.primary }}
              onPress={handleSubmit}
              disabled={pin.length < 4 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text className="text-base font-semibold text-white">{t('common.confirm', 'Confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ProfileSelectionScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigation = useNavigation<any>();
  const { isPhone } = useResponsive();
  const {
    profiles,
    isLoading,
    error,
    selectProfile,
    fetchProfiles,
  } = useProfile();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'none'>('none');

  // Responsive columns: 2 on phone, 3 on tablet
  const numColumns = getGridColumns({ phone: 2, tablet: 3 });

  useEffect(() => {
    fetchProfiles();
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await BiometricAuth.hasHardwareAsync();
      if (compatible) {
        const types = await BiometricAuth.supportedAuthenticationTypesAsync();
        if (types.includes(BiometricAuth.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
          setHasBiometric(true);
        } else if (types.includes(BiometricAuth.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
          setHasBiometric(true);
        }
      }
    } catch (error) {
      moduleLogger.error('Biometric check failed:', error);
    }
  };

  const handleProfileSelect = useCallback(async (profile: Profile) => {
    if (isManageMode) {
      navigation.navigate('EditProfile', { profileId: profile.id });
      return;
    }

    if (profile.has_pin) {
      setSelectedProfile(profile);
      setShowPinModal(true);
      setPinError('');
      return;
    }

    try {
      await selectProfile(profile.id);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      navigation.replace('Main');
    } catch (err: any) {
      ReactNativeHapticFeedback.trigger('notificationError');
      setPinError(err.detail || t('profiles.selectFailed', 'Failed to select profile'));
    }
  }, [isManageMode, navigation, selectProfile, t]);

  const handlePinSubmit = useCallback(async (pin: string) => {
    if (!selectedProfile) return;

    try {
      await selectProfile(selectedProfile.id, pin);
      setShowPinModal(false);
      setSelectedProfile(null);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      navigation.replace('Main');
    } catch (err: any) {
      ReactNativeHapticFeedback.trigger('notificationError');
      setPinError(err.detail || t('profiles.incorrectPin', 'Incorrect PIN'));
    }
  }, [selectedProfile, selectProfile, navigation, t]);

  const handleBiometricAuth = useCallback(async () => {
    if (!selectedProfile) return;

    try {
      const result = await BiometricAuth.authenticateAsync({
        promptMessage: t('profiles.biometricPrompt', 'Authenticate to access profile'),
        cancelLabel: t('common.cancel', 'Cancel'),
        fallbackLabel: t('profiles.usePin', 'Use PIN'),
      });

      if (result.success) {
        // Biometric success - still need to verify with backend
        // For now, we'll bypass PIN for biometric-authenticated profiles
        await selectProfile(selectedProfile.id);
        setShowPinModal(false);
        setSelectedProfile(null);
        ReactNativeHapticFeedback.trigger('notificationSuccess');
        navigation.replace('Main');
      }
    } catch (err: any) {
      moduleLogger.error('Biometric auth failed:', err);
      ReactNativeHapticFeedback.trigger('notificationError');
    }
  }, [selectedProfile, selectProfile, navigation, t]);

  const handleAddProfile = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('CreateProfile');
  }, [navigation]);

  const canAddProfile = profiles.length < 5;

  if (isLoading && profiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-base text-gray-400">{t('common.loading', 'Loading...')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View className="mb-8">
          <Image
            source={require('../../../shared/assets/images/logos/logo.png')}
            className="w-[120px] h-11"
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text className="text-2xl font-semibold text-white mb-8 text-center">
          {isManageMode
            ? t('profiles.manageProfiles', 'Manage Profiles')
            : t('profiles.whoIsWatching', "Who's Watching?")}
        </Text>

        {/* Profiles Grid */}
        <View
          className="flex-wrap justify-center items-start max-w-[400px] gap-4"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={handleProfileSelect}
              isSelected={selectedProfile?.id === profile.id}
              isManageMode={isManageMode}
            />
          ))}

          {/* Add Profile Button */}
          {canAddProfile && (
            <TouchableOpacity
              className="items-center w-[100px]"
              onPress={handleAddProfile}
              activeOpacity={0.7}
            >
              <View className="w-20 h-20 rounded-xl justify-center items-center mb-2 bg-white/10 border-2 border-white/20 border-dashed">
                <Text className="text-[32px] text-gray-400 font-light">+</Text>
              </View>
              <Text className="text-[14px] text-gray-400">
                {t('profiles.addProfile', 'Add Profile')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manage Profiles Button */}
        <TouchableOpacity
          className="mt-8 px-4 py-2 rounded min-h-[48px] justify-center border border-gray-400"
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight');
            setIsManageMode(!isManageMode);
          }}
        >
          <Text className="text-[14px] text-gray-400">
            {isManageMode
              ? t('common.done', 'Done')
              : t('profiles.manageProfiles', 'Manage Profiles')}
          </Text>
        </TouchableOpacity>

        {error && <Text className="mt-4 text-[14px] text-red-500 text-center">{error}</Text>}
      </ScrollView>

      {/* PIN Modal */}
      <PinModal
        visible={showPinModal}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setShowPinModal(false);
          setSelectedProfile(null);
          setPinError('');
        }}
        onBiometric={handleBiometricAuth}
        hasBiometric={hasBiometric && !!selectedProfile}
        error={pinError}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
};

export default ProfileSelectionScreenMobile;
