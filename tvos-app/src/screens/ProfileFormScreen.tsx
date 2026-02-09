/**
 * ProfileFormScreen - Create or Edit Profile
 * Used for both creating new profiles and editing existing ones on tvOS
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@bayit/shared-contexts';
import { useDirection } from '@bayit/shared-hooks';
import { GlassView } from '@bayit/shared';
import { AvatarSelector, AVATAR_COLORS, AVATAR_INITIALS } from '../components/profile/AvatarSelector';
import { PinSection } from '../components/profile/PinSection';

export const ProfileFormScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { createProfile, updateProfile, profiles, isLoading } = useProfile();

  const isEditMode = !!route.params?.profileId;
  const existingProfile = profiles.find(p => p.id === route.params?.profileId);

  const [name, setName] = useState(existingProfile?.name || '');
  const [selectedColor, setSelectedColor] = useState(existingProfile?.avatar_color || AVATAR_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(existingProfile?.avatar || AVATAR_INITIALS[0]);
  const [isKidsProfile, setIsKidsProfile] = useState(existingProfile?.is_kids_profile || false);
  const [kidsAgeLimit, setKidsAgeLimit] = useState(existingProfile?.kids_age_limit || 12);
  const [hasPin, setHasPin] = useState(existingProfile?.has_pin || false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError(t('profiles.errors.nameRequired', 'Profile name is required')); return; }
    if (name.trim().length < 2) { setError(t('profiles.errors.nameTooShort', 'Profile name must be at least 2 characters')); return; }
    if (hasPin && !isEditMode) {
      if (pin.length !== 4) { setError(t('profiles.errors.pinLength', 'PIN must be 4 digits')); return; }
      if (pin !== confirmPin) { setError(t('profiles.errors.pinMismatch', 'PINs do not match')); return; }
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
      if (isEditMode) { await updateProfile(route.params.profileId, profileData); }
      else { await createProfile(profileData); }
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || t('profiles.errors.saveFailed', 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 40 }}>
      <GlassView intensity="medium" className="p-10 max-w-[600px] self-center w-full">
        <Text className="text-[32px] font-bold text-white mb-10" style={{ textAlign }}>
          {isEditMode ? t('profiles.editProfile', 'Edit Profile') : t('profiles.createProfile', 'Create Profile')}
        </Text>

        {error && (
          <View className="bg-red-500/20 p-4 rounded-lg mb-6 border border-red-500">
            <Text className="text-red-500 text-sm text-center">{error}</Text>
          </View>
        )}

        <View className="mb-6">
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.name', 'Profile Name')}
          </Text>
          <TextInput
            className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 ${
              focusedItem === 'name' ? 'border-purple-500 bg-purple-500/30' : 'border-white/20'
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

        <AvatarSelector
          selectedEmoji={selectedEmoji}
          selectedColor={selectedColor}
          focusedItem={focusedItem}
          onSelectEmoji={setSelectedEmoji}
          onSelectColor={setSelectedColor}
          onFocusItem={setFocusedItem}
        />

        <PinSection
          isKidsProfile={isKidsProfile}
          kidsAgeLimit={kidsAgeLimit}
          hasPin={hasPin}
          pin={pin}
          confirmPin={confirmPin}
          isEditMode={isEditMode}
          focusedItem={focusedItem}
          onToggleKids={setIsKidsProfile}
          onSetAgeLimit={setKidsAgeLimit}
          onTogglePin={setHasPin}
          onSetPin={setPin}
          onSetConfirmPin={setConfirmPin}
          onFocusItem={setFocusedItem}
        />

        <View className="gap-4 mt-10" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <Pressable
            className={`flex-1 py-6 rounded-full items-center justify-center border-[3px] bg-white/10 ${
              focusedItem === 'cancel' ? 'border-white scale-[1.03]' : 'border-transparent'
            }`}
            onPress={() => navigation.goBack()}
            onFocus={() => setFocusedItem('cancel')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving}
          >
            <Text className="text-lg text-white font-semibold">{t('common.cancel', 'Cancel')}</Text>
          </Pressable>

          <Pressable
            className={`flex-1 py-6 rounded-full items-center justify-center border-[3px] bg-purple-500 ${
              focusedItem === 'save' ? 'border-white scale-[1.03]' : 'border-transparent'
            } ${saving ? 'opacity-50' : ''}`}
            onPress={handleSave}
            onFocus={() => setFocusedItem('save')}
            onBlur={() => setFocusedItem(null)}
            disabled={saving || isLoading}
          >
            {saving ? (
              <GlassLoadingSpinner size="small" />
            ) : (
              <Text className="text-lg text-black font-bold">{t('common.save', 'Save')}</Text>
            )}
          </Pressable>
        </View>
      </GlassView>
    </ScrollView>
  );
};
