/**
 * CultureSelector Component
 *
 * Allows users to select their preferred culture in Settings.
 * Displays a grid of available cultures with flags and names.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { GlassView } from '../ui/GlassView';
import { useCultureStore, Culture } from '../../contexts/CultureContext';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { isTV } from '../../utils/platform';

interface CultureSelectorProps {
  variant?: 'inline' | 'modal';
  showLabel?: boolean;
  onCultureChange?: (cultureId: string) => void;
}

/**
 * CultureSelector Component
 *
 * Displays the current culture selection and allows changing it.
 * Supports both inline and modal display modes.
 */
export const CultureSelector: React.FC<CultureSelectorProps> = ({
  variant = 'modal',
  showLabel = true,
  onCultureChange,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const {
    cultures,
    currentCulture,
    setCulture,
    isLoading,
    fetchCultures,
    getLocalizedName,
  } = useCultureStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [focusedCultureId, setFocusedCultureId] = useState<string | null>(null);
  const [backdropActive, setBackdropActive] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch cultures on mount if not loaded
  useEffect(() => {
    if (cultures.length === 0) {
      fetchCultures();
    }
  }, [cultures.length, fetchCultures]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, fadeAnim]);

  // Delay backdrop activation to prevent immediate close on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setBackdropActive(true), 500);
      return () => clearTimeout(timer);
    }
    setBackdropActive(false);
    return undefined;
  }, [isOpen]);

  const handleSelectCulture = async (cultureId: string) => {
    await setCulture(cultureId);
    onCultureChange?.(cultureId);
    setIsOpen(false);
  };

  const getCurrentCultureDisplay = () => {
    if (!currentCulture) {
      return {
        flag: '🌍',
        name: t('cultures.select'),
      };
    }
    return {
      flag: currentCulture.flag_emoji || '🌍',
      name: getLocalizedName(currentCulture, i18n.language),
    };
  };

  const currentDisplay = getCurrentCultureDisplay();

  // For inline variant, render a horizontal list
  if (variant === 'inline') {
    return (
      <View className="my-4">
        {showLabel && (
          <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold text-white mb-4 px-4`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('cultures.selectCulture')}
          </Text>
        )}
        {isLoading ? (
          <View className="h-[100px] justify-center items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName={`px-4 gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {cultures.map((culture, index) => (
              <CultureCard
                key={culture.culture_id}
                culture={culture}
                isSelected={currentCulture?.culture_id === culture.culture_id}
                isFocused={focusedCultureId === culture.culture_id}
                onFocus={() => setFocusedCultureId(culture.culture_id)}
                onBlur={() => setFocusedCultureId(null)}
                onPress={() => handleSelectCulture(culture.culture_id)}
                localizedName={getLocalizedName(culture, i18n.language)}
                autoFocus={index === 0}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Modal variant - button that opens a modal
  return (
    <View className="relative">
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`flex-row items-center p-4 rounded-lg bg-white/5 border ${isFocused ? 'border-[#6B21A8] bg-[#6B21A8]/30' : 'border-transparent'} gap-2`}
        accessibilityLabel={t('cultures.changeCulture')}
        accessibilityRole="button"
      >
        <Text className={isTV ? 'text-[28px]' : 'text-2xl'}>{currentDisplay.flag}</Text>
        {showLabel && (
          <Text className={`flex-1 ${isTV ? 'text-base' : 'text-sm'} text-white`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {currentDisplay.name}
          </Text>
        )}
        <Text className="text-xs text-white/60">{isRTL ? '◂' : '▸'}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/70 justify-center items-center"
          activeOpacity={1}
          onPress={backdropActive ? () => setIsOpen(false) : undefined}
        >
          <View
            className={isTV ? 'w-[600px]' : 'w-[340px] max-w-[90%]'}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <GlassView intensity="high" className="p-6 rounded-3xl">
              <Text className={`${isTV ? 'text-xl' : 'text-lg'} font-bold text-white text-center mb-1`}>
                {t('cultures.selectCulture')}
              </Text>
              <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-white/70 text-center mb-6`}>
                {t('cultures.selectCultureDescription')}
              </Text>

              {isLoading ? (
                <View className="h-[100px] justify-center items-center">
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : (
                <View className={`flex-wrap justify-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  {cultures.map((culture, index) => (
                    <CultureCard
                      key={culture.culture_id}
                      culture={culture}
                      isSelected={currentCulture?.culture_id === culture.culture_id}
                      isFocused={focusedCultureId === culture.culture_id}
                      onFocus={() => setFocusedCultureId(culture.culture_id)}
                      onBlur={() => setFocusedCultureId(null)}
                      onPress={() => handleSelectCulture(culture.culture_id)}
                      localizedName={getLocalizedName(culture, i18n.language)}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                className="p-4 items-center rounded-md bg-white/10"
                onPress={() => setIsOpen(false)}
              >
                <Text className={`${isTV ? 'text-base' : 'text-sm'} text-white/70`}>{t('common.close')}</Text>
              </TouchableOpacity>
            </GlassView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

interface CultureCardProps {
  culture: Culture;
  isSelected: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
  localizedName: string;
  autoFocus?: boolean;
}

const CultureCard: React.FC<CultureCardProps> = ({
  culture,
  isSelected,
  isFocused,
  onFocus,
  onBlur,
  onPress,
  localizedName,
  autoFocus,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, scaleAnim]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      activeOpacity={0.8}
      accessibilityLabel={localizedName}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      // @ts-expect-error - TV/Web specific props
      autoFocus={autoFocus}
      tabIndex={0}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassView
          className={`${isTV ? 'w-[140px]' : 'w-[100px]'} p-4 rounded-lg items-center border-2 ${
            isSelected ? 'border-[#6B21A8] bg-[#6B21A8]/30' : 'border-transparent'
          } ${
            isFocused ? 'border-purple-400 bg-[#6B21A8]/40 shadow-purple-400' : ''
          } bg-[#1E1E32]/60`}
          intensity="medium"
          style={isFocused ? {
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          } : undefined}
        >
          {isSelected && (
            <View className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#6B21A8] justify-center items-center">
              <Text className="text-xs text-white font-bold">✓</Text>
            </View>
          )}
          <Text className={`${isTV ? 'text-[40px]' : 'text-[32px]'} mb-1`}>{culture.flag_emoji || '🌍'}</Text>
          <Text className={`${isTV ? 'text-sm' : 'text-xs'} ${isSelected ? 'text-[#6B21A8] font-semibold' : 'text-white'} text-center`} numberOfLines={1}>
            {localizedName}
          </Text>
          {culture.has_shabbat_mode && (
            <Text className="text-xs mt-1">🕯️</Text>
          )}
          {culture.has_lunar_calendar && (
            <Text className="text-xs mt-1">🌙</Text>
          )}
        </GlassView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default CultureSelector;
