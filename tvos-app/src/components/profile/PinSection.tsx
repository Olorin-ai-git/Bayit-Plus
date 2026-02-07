/**
 * PinSection - PIN protection and kids profile settings
 */

import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { GlassTVSwitch } from '@bayit/glass';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';

const KIDS_AGE_LIMITS = [
  { value: 3, label: '0-3' },
  { value: 7, label: '4-7' },
  { value: 12, label: '8-12' },
  { value: 18, label: '13+' },
];

export { KIDS_AGE_LIMITS };

interface PinSectionProps {
  isKidsProfile: boolean;
  kidsAgeLimit: number;
  hasPin: boolean;
  pin: string;
  confirmPin: string;
  isEditMode: boolean;
  focusedItem: string | null;
  onToggleKids: (value: boolean) => void;
  onSetAgeLimit: (value: number) => void;
  onTogglePin: (value: boolean) => void;
  onSetPin: (value: string) => void;
  onSetConfirmPin: (value: string) => void;
  onFocusItem: (item: string | null) => void;
}

export function PinSection({
  isKidsProfile, kidsAgeLimit, hasPin, pin, confirmPin, isEditMode,
  focusedItem, onToggleKids, onSetAgeLimit, onTogglePin, onSetPin, onSetConfirmPin, onFocusItem,
}: PinSectionProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <>
      <View className="mb-6">
        <View className="justify-between items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.kidsProfile', 'Kids Profile')}
          </Text>
          <GlassTVSwitch value={isKidsProfile} onValueChange={onToggleKids} />
        </View>
        <Text className="text-xs text-gray-400 mt-1" style={{ textAlign }}>
          {t('profiles.kidsProfileHint', 'Restricts content to age-appropriate material')}
        </Text>
      </View>

      {isKidsProfile && (
        <View className="mb-6">
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.ageLimit', 'Age Limit')}
          </Text>
          <View className="gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {KIDS_AGE_LIMITS.map((option) => (
              <Pressable
                key={option.value}
                className={`flex-1 py-4 px-6 rounded-lg border-2 items-center ${
                  kidsAgeLimit === option.value ? 'bg-purple-500 border-purple-500' : 'bg-white/10 border-transparent'
                } ${focusedItem === `age-${option.value}` ? 'border-white scale-105' : ''}`}
                onPress={() => onSetAgeLimit(option.value)}
                onFocus={() => onFocusItem(`age-${option.value}`)}
                onBlur={() => onFocusItem(null)}
              >
                <Text className={`text-base font-semibold ${
                  kidsAgeLimit === option.value ? 'text-black' : 'text-white'
                }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View className="mb-6">
        <View className="justify-between items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
            {t('profiles.pinProtection', 'PIN Protection')}
          </Text>
          <GlassTVSwitch value={hasPin} onValueChange={onTogglePin} />
        </View>
        <Text className="text-xs text-gray-400 mt-1" style={{ textAlign }}>
          {t('profiles.pinHint', 'Require a 4-digit PIN to access this profile')}
        </Text>

        {hasPin && !isEditMode && (
          <View className="mt-4 gap-2">
            <TextInput
              className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 text-center tracking-[8px] text-2xl ${
                focusedItem === 'pin' ? 'border-purple-500 bg-purple-500/30' : 'border-white/20'
              }`}
              value={pin}
              onChangeText={(text) => onSetPin(text.replace(/[^0-9]/g, ''))}
              placeholder={t('profiles.enterPin', 'Enter 4-digit PIN')}
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              onFocus={() => onFocusItem('pin')}
              onBlur={() => onFocusItem(null)}
            />
            <TextInput
              className={`bg-white/10 rounded-lg p-4 text-lg text-white border-2 text-center tracking-[8px] text-2xl ${
                focusedItem === 'confirmPin' ? 'border-purple-500 bg-purple-500/30' : 'border-white/20'
              }`}
              value={confirmPin}
              onChangeText={(text) => onSetConfirmPin(text.replace(/[^0-9]/g, ''))}
              placeholder={t('profiles.confirmPin', 'Confirm PIN')}
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              onFocus={() => onFocusItem('confirmPin')}
              onBlur={() => onFocusItem(null)}
            />
          </View>
        )}
      </View>
    </>
  );
}
