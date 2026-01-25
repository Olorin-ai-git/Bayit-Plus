import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface CastMember {
  id: string;
  name: string;
  character?: string;
  photo?: string;
}

export interface CastCarouselProps {
  cast: CastMember[];
  onCastPress?: (castMember: CastMember) => void;
}

const CastCard: React.FC<{
  castMember: CastMember;
  onPress?: () => void;
  index: number;
}> = ({ castMember, onPress, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      className={`${isTV ? 'mr-6' : 'mr-4'}`}
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`items-center ${isTV ? 'w-[180px]' : 'w-[120px]'} rounded-2xl bg-white/5 ${
          isTV ? 'p-4' : 'p-2'
        } border-2 ${isFocused ? 'border-primary bg-primary/15' : 'border-transparent'}`}
      >
        {castMember.photo ? (
          <Image
            source={{ uri: castMember.photo }}
            className={`${isTV ? 'w-[140px] h-[140px]' : 'w-[90px] h-[90px]'} rounded-full bg-white/5 mb-2`}
            resizeMode="cover"
          />
        ) : (
          <View className={`${isTV ? 'w-[140px] h-[140px]' : 'w-[90px] h-[90px]'} rounded-full bg-primary/30 justify-center items-center mb-2`}>
            <Text className={`${isTV ? 'text-5xl' : 'text-[32px]'} font-semibold text-white`}>
              {castMember.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="items-center w-full">
          <Text style={{ textAlign }} className={`${isTV ? 'text-lg' : 'text-sm'} font-semibold text-white mb-0.5`} numberOfLines={1}>
            {castMember.name}
          </Text>
          {castMember.character && (
            <Text style={{ textAlign }} className={`${isTV ? 'text-sm' : 'text-xs'} text-textSecondary`} numberOfLines={1}>
              {castMember.character}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CastCarousel: React.FC<CastCarouselProps> = ({ cast, onCastPress }) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <View className={`${isTV ? 'my-8' : 'my-6'}`}>
      <Text style={{ textAlign }} className={`${isTV ? 'text-[28px]' : 'text-xl'} font-semibold text-white ${
        isTV ? 'mb-6' : 'mb-4'
      } ${isTV ? 'px-8' : 'px-6'}`}>
        {t('content.castAndCrew', 'Cast & Crew')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={`${isTV ? 'px-8' : 'px-6'} py-2`}
        className="overflow-visible"
      >
        {cast.map((castMember, index) => (
          <CastCard
            key={castMember.id}
            castMember={castMember}
            onPress={() => onCastPress?.(castMember)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default CastCarousel;
