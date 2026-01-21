/**
 * ProfileFormScreen - Create or Edit Profile
 * Used for both creating new profiles and editing existing ones on tvOS
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@bayit/shared-contexts';
import { useDirection } from '@bayit/shared-hooks';
import { GlassView, GlassButton } from '@bayit/shared';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

// Avatar options
const AVATAR_COLORS = [
  '#a855f7', '#ff6b6b', '#4ecdc4', '#ffd93d',
  '#6c5ce7', '#a8e6cf', '#ff8b94', '#ffaaa5',
];

const AVATAR_EMOJIS = ['👤', '👨', '👩', '👶', '👦', '👧', '🧒', '👨‍💼', '👩‍💼', '🎭'];

const KIDS_AGE_LIMITS = [
  { value: 3, label: '0-3' },
  { value: 7, label: '4-7' },
  { value: 12, label: '8-12' },
  { value: 18, label: '13+' },
];

export const ProfileFormScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { createProfile, updateProfile, profiles, isLoading } = useProfile();

  const isEditMode = !!route.params?.profileId;
  const existingProfile = profiles.find(p => p.id === route.params?.profileId);

  // Form state
  const [name, setName] = useState(existingProfile?.name || '');
  const [selectedColor, setSelectedColor] = useState(
    existingProfile?.avatar_color || AVATAR_COLORS[0]
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    existingProfile?.avatar || AVATAR_EMOJIS[0]
  );
  const [isKidsProfile, setIsKidsProfile] = useState(
    existingProfile?.is_kids_profile || false
  );
  const [kidsAgeLimit, setKidsAgeLimit] = useState(
    existingProfile?.kids_age_limit || 12
  );
  const [hasPin, setHasPin] = useState(existingProfile?.has_pin || false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Focus states for TV navigation
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError(t('profiles.errors.nameRequired', 'Profile name is required'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('profiles.errors.nameTooShort', 'Profile name must be at least 2 characters'));
      return;
    }

    if (hasPin && !isEditMode) {
      if (pin.length !== 4) {
        setError(t('profiles.errors.pinLength', 'PIN must be 4 digits'));
        return;
      }
      if (pin !== confirmPin) {
        setError(t('profiles.errors.pinMismatch', 'PINs do not match'));
        return;
      }
    }

    setSaving(true);
    try {
      const profileData = {
        name: name.trim(),
        avatar: selectedEmoji,
        avatar_color: selectedColor,
        is_kids_profile: isKidsProfile,
        kids_age_limit: isKidsProfile ? kidsAgeLimit : undefined,
        pin: hasPin && pin ? pin : undefined,
      };

      if (isEditMode) {
        await updateProfile(route.params.profileId, profileData);
      } else {
        await createProfile(profileData);
      }

      navigation.goBack();
    } catch (err: any) {
      setError(err.message || t('profiles.errors.saveFailed', 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0d0d1a]"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 40 }}
    >
      <GlassView intensity="medium" className="p-10 max-w-[600px] self-center w-full">
        <Text className="text-[32px] font-bold text-white mb-10" style={{ textAlign }}>
          {isEditMode
            ? t('profiles.editProfile', 'Edit Profile')
            : t('profiles.createProfile', 'Create Profile')}
        </Text>

        {error && (
          <View className="bg-red-500/20 p-4 rounded-lg mb-6 border border-red-500">
            <Text className="text-red-500 text-sm text-center">{error}</Text>
          </View>
        )}

        {/* Name Input */}
        <View className="mb-6">
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.name', 'Profile Name')}
          </Text>
          <TextInput
            className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 ${
              focusedItem === 'name' ? 'border-purple-500 bg-[rgba(107,33,168,0.3)]' : 'border-white/20'
            }`}
            style={{ textAlign }}
            value={name}
            onChangeText={setName}
            placeholder={t('profiles.namePlaceholder', 'Enter profile name')}
            placeholderTextColor="#666"
            maxLength={30}
            onFocus={() => setFocusedItem('name')}
            onBlur={() => setFocusedItem(null)}
          />
        </View>

        {/* Avatar Emoji Selection */}
        <View className="mb-6">
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.avatar', 'Avatar')}
          </Text>
          <View className="flex-wrap gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {AVATAR_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                className={`w-[60px] h-[60px] rounded-full bg-white/10 justify-center items-center border-[3px] ${
                  selectedEmoji === emoji ? 'border-purple-500 bg-[rgba(107,33,168,0.3)]' : 'border-transparent'
                } ${
                  focusedItem === `emoji-${emoji}` ? 'border-white scale-110' : ''
                }`}
                onPress={() => setSelectedEmoji(emoji)}
                onFocus={() => setFocusedItem(`emoji-${emoji}`)}
                onBlur={() => setFocusedItem(null)}
              >
                <Text className="text-[32px]">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Selection */}
        <View className="mb-6">
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.color', 'Color')}
          </Text>
          <View className="flex-wrap gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {AVATAR_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                className={`w-[50px] h-[50px] rounded-full border-[3px] ${
                  selectedColor === color ? 'border-white' : 'border-transparent'
                } ${
                  focusedItem === `color-${color}` ? 'scale-115 border-white' : ''
                }`}
                style={{ backgroundColor: color }}
                onPress={() => setSelectedColor(color)}
                onFocus={() => setFocusedItem(`color-${color}`)}
                onBlur={() => setFocusedItem(null)}
              />
            ))}
          </View>
        </View>

        {/* Kids Profile Toggle */}
        <View className="mb-6">
          <View className="justify-between items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
              {t('profiles.kidsProfile', 'Kids Profile')}
            </Text>
            <Switch
              value={isKidsProfile}
              onValueChange={setIsKidsProfile}
              trackColor={{ false: '#666', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Text className="text-xs text-gray-400 mt-1" style={{ textAlign }}>
            {t('profiles.kidsProfileHint', 'Restricts content to age-appropriate material')}
          </Text>
        </View>

        {/* Age Limit (only for kids profiles) */}
        {isKidsProfile && (
          <View className="mb-6">
            <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
              {t('profiles.ageLimit', 'Age Limit')}
            </Text>
            <View className="gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {KIDS_AGE_LIMITS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 py-4 px-6 rounded-lg border-2 items-center ${
                    kidsAgeLimit === option.value
                      ? 'bg-purple-500 border-purple-500'
                      : 'bg-white/10 border-transparent'
                  } ${
                    focusedItem === `age-${option.value}` ? 'border-white scale-105' : ''
                  }`}
                  onPress={() => setKidsAgeLimit(option.value)}
                  onFocus={() => setFocusedItem(`age-${option.value}`)}
                  onBlur={() => setFocusedItem(null)}
                >
                  <Text className={`text-base font-semibold ${
                    kidsAgeLimit === option.value ? 'text-[#0d0d1a]' : 'text-white'
                  }`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* PIN Protection (only for new profiles or if changing) */}
        <View className="mb-6">
          <View className="justify-between items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
              {t('profiles.pinProtection', 'PIN Protection')}
            </Text>
            <Switch
              value={hasPin}
              onValueChange={setHasPin}
              trackColor={{ false: '#666', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Text className="text-xs text-gray-400 mt-1" style={{ textAlign }}>
            {t('profiles.pinHint', 'Require a 4-digit PIN to access this profile')}
          </Text>

          {hasPin && !isEditMode && (
            <View className="mt-4 gap-2">
              <TextInput
                className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 text-center tracking-[8px] text-2xl ${
                  focusedItem === 'pin' ? 'border-purple-500 bg-[rgba(107,33,168,0.3)]' : 'border-white/20'
                }`}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
                placeholder={t('profiles.enterPin', 'Enter 4-digit PIN')}
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                onFocus={() => setFocusedItem('pin')}
                onBlur={() => setFocusedItem(null)}
              />
              <TextInput
                className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 text-center tracking-[8px] text-2xl ${
                  focusedItem === 'confirmPin' ? 'border-purple-500 bg-[rgba(107,33,168,0.3)]' : 'border-white/20'
                }`}
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ''))}
                placeholder={t('profiles.confirmPin', 'Confirm PIN')}
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                onFocus={() => setFocusedItem('confirmPin')}
                onBlur={() => setFocusedItem(null)}
              />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="gap-4 mt-10" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <TouchableOpacity
            className={`flex-1 py-6 rounded-full items-center justify-center border-[3px] bg-white/10 ${
              focusedItem === 'cancel' ? 'border-white scale-[1.03]' : 'border-transparent'
            }`}
            onPress={() => navigation.goBack()}
            onFocus={() => setFocusedItem('cancel')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving}
          >
            <Text className="text-lg text-white font-semibold">
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-6 rounded-full items-center justify-center border-[3px] bg-purple-500 ${
              focusedItem === 'save' ? 'border-white scale-[1.03]' : 'border-transparent'
            } ${saving ? 'opacity-50' : ''}`}
            onPress={handleSave}
            onFocus={() => setFocusedItem('save')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving || isLoading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-lg text-[#0d0d1a] font-bold">
                {t('common.save', 'Save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassView>
    </ScrollView>
  );
};

export default ProfileFormScreen;
