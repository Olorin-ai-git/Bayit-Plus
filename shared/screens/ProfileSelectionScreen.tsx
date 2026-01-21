/**
 * ProfileSelectionScreen - Netflix-style profile picker
 * Shows when user logs in and has multiple profiles
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useProfile, Profile } from '../contexts/ProfileContext';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { GlassView } from '../components/ui';
import { colors } from '../theme';
import { useDirection } from '../hooks/useDirection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROFILE_SIZE = Platform.OS === 'web' ? 140 : 100;

// Profile avatar colors
const AVATAR_COLORS = [
  '#a855f7', // Cyan
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffd93d', // Yellow
  '#6c5ce7', // Purple
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#ffaaa5', // Coral
];

// Profile avatar emojis
const AVATAR_EMOJIS = ['', '', '', '', '', '', '', '', '', ''];

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

  return (
    <TouchableOpacity
      className={`items-center w-[${PROFILE_SIZE + 20}px] ${
        isSelected ? 'opacity-70' : ''
      } ${isManageMode ? 'opacity-90' : ''}`}
      onPress={() => onSelect(profile)}
      activeOpacity={0.7}
    >
      <View
        className="justify-center items-center mb-3 border-[3px] border-transparent rounded-xl"
        style={{
          width: PROFILE_SIZE,
          height: PROFILE_SIZE,
          backgroundColor: profile.avatar_color || AVATAR_COLORS[0],
        }}
      >
        {profile.avatar ? (
          <Text style={{ fontSize: PROFILE_SIZE * 0.5 }}>{profile.avatar}</Text>
        ) : (
          <Text className="font-bold text-white" style={{ fontSize: PROFILE_SIZE * 0.35, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{getInitials(profile.name)}</Text>
        )}
        {profile.is_kids_profile && (
          <View className="absolute -bottom-1.5 -right-1.5 bg-[#ffd93d] rounded-xl p-1">
            <Text className="text-xs"></Text>
          </View>
        )}
        {profile.has_pin && (
          <View className="absolute -top-1.5 -right-1.5 bg-black/60 rounded-[10px] p-1">
            <Text className="text-[10px]"></Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-400 text-center" style={{ maxWidth: PROFILE_SIZE + 20 }} numberOfLines={1}>
        {profile.name}
      </Text>
      {isManageMode && (
        <View
          className="absolute top-0 bg-black/50 rounded-xl justify-center items-center"
          style={{
            left: (PROFILE_SIZE + 20 - PROFILE_SIZE) / 2,
            width: PROFILE_SIZE,
            height: PROFILE_SIZE,
          }}
        >
          <Text className="text-2xl"></Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface PinModalProps {
  visible: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string;
  isLoading?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  error,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <View className="absolute inset-0 bg-black/80 justify-center items-center">
      <GlassView intensity="high" className="w-[320px] p-6 rounded-2xl items-center">
        <Text className="text-xl font-semibold text-white mb-5">{t('profiles.enterPin', 'Enter PIN')}</Text>
        <TextInput
          ref={inputRef}
          className="w-full h-14 bg-white/10 rounded-lg px-4 text-2xl text-white text-center tracking-[8px] mb-4"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder={t('placeholder.pin', '••••')}
          placeholderTextColor="#666666"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text className="text-sm text-red-500 mb-4">{error}</Text>}
        <View className="flex-row gap-3 w-full">
          <TouchableOpacity className="flex-1 h-11 justify-center items-center rounded-lg bg-white/10" onPress={onCancel}>
            <Text className="text-base text-gray-400">{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 h-11 justify-center items-center rounded-lg bg-[#a855f7] ${
              pin.length < 4 ? 'opacity-50' : ''
            }`}
            onPress={handleSubmit}
            disabled={pin.length < 4 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">{t('common.confirm', 'Confirm')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassView>
    </View>
  );
};

export const ProfileSelectionScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigation = useNavigation<any>();
  const {
    profiles,
    isLoading,
    error,
    selectProfile,
    fetchProfiles,
    setNeedsProfileSelection,
  } = useProfile();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleProfileSelect = async (profile: Profile) => {
    if (isManageMode) {
      // Navigate to edit profile
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
      navigation.replace('Main');
    } catch (err: any) {
      setPinError(err.detail || t('profiles.selectFailed', 'Failed to select profile'));
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedProfile) return;

    try {
      await selectProfile(selectedProfile.id, pin);
      setShowPinModal(false);
      setSelectedProfile(null);
      navigation.replace('Main');
    } catch (err: any) {
      setPinError(err.detail || t('profiles.incorrectPin', 'Incorrect PIN'));
    }
  };

  const handleAddProfile = () => {
    navigation.navigate('CreateProfile');
  };

  const canAddProfile = profiles.length < 5; // Max 5 profiles

  if (isLoading && profiles.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-base text-gray-400">{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Background */}
      <View className="absolute inset-0 bg-[rgba(107,33,168,0.1)]" pointerEvents="none" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View className="mb-10">
          <AnimatedLogo size="medium" />
        </View>

        {/* Title */}
        <Text className="text-[28px] font-semibold text-white mb-10 text-center">
          {isManageMode
            ? t('profiles.manageProfiles', 'Manage Profiles')
            : t('profiles.whoIsWatching', "Who's Watching?")}
        </Text>

        {/* Profiles Grid */}
        <View className={`flex-wrap justify-center items-start max-w-[700px] gap-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
              className="items-center"
              style={{ width: PROFILE_SIZE + 20 }}
              onPress={handleAddProfile}
              activeOpacity={0.7}
            >
              <View
                className="justify-center items-center mb-3 bg-white/10 border-2 border-white/20 border-dashed rounded-xl"
                style={{ width: PROFILE_SIZE, height: PROFILE_SIZE }}
              >
                <Text className="text-gray-400 font-light" style={{ fontSize: PROFILE_SIZE * 0.4 }}>+</Text>
              </View>
              <Text className="text-sm text-gray-400">
                {t('profiles.addProfile', 'Add Profile')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manage Profiles Button */}
        <TouchableOpacity
          className="mt-10 px-6 py-2.5 rounded border border-gray-400"
          onPress={() => setIsManageMode(!isManageMode)}
        >
          <Text className="text-sm text-gray-400">
            {isManageMode
              ? t('common.done', 'Done')
              : t('profiles.manageProfiles', 'Manage Profiles')}
          </Text>
        </TouchableOpacity>

        {error && <Text className="mt-5 text-sm text-red-500 text-center">{error}</Text>}
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
        error={pinError}
        isLoading={isLoading}
      />
    </View>
  );
};

export default ProfileSelectionScreen;
