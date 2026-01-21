import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
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
      style={styles.castCardTouchable}
    >
      <Animated.View
        style={[
          styles.castCard,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.castCardFocused,
        ]}
      >
        {castMember.photo ? (
          <Image
            source={{ uri: castMember.photo }}
            style={styles.castPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.castPhotoPlaceholder}>
            <Text style={styles.castPhotoPlaceholderText}>
              {castMember.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.castInfo}>
          <Text style={[styles.castName, { textAlign }]} numberOfLines={1}>
            {castMember.name}
          </Text>
          {castMember.character && (
            <Text style={[styles.castCharacter, { textAlign }]} numberOfLines={1}>
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
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('content.castAndCrew', 'Cast & Crew')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
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

const styles = StyleSheet.create({
  container: {
    marginVertical: isTV ? spacing.xl : spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? 28 : 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: isTV ? spacing.lg : spacing.md,
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
  },
  scrollView: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: spacing.sm,
  },
  castCardTouchable: {
    marginRight: isTV ? spacing.lg : spacing.md,
  },
  castCard: {
    alignItems: 'center',
    width: isTV ? 180 : 120,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: isTV ? spacing.md : spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  castCardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  castPhoto: {
    width: isTV ? 140 : 90,
    height: isTV ? 140 : 90,
    borderRadius: isTV ? 70 : 45,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: spacing.sm,
  },
  castPhotoPlaceholder: {
    width: isTV ? 140 : 90,
    height: isTV ? 140 : 90,
    borderRadius: isTV ? 70 : 45,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  castPhotoPlaceholderText: {
    fontSize: isTV ? 48 : 32,
    fontWeight: '600',
    color: colors.text,
  },
  castInfo: {
    alignItems: 'center',
    width: '100%',
  },
  castName: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  castCharacter: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
});

export default CastCarousel;
