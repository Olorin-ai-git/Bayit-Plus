import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../theme';
import { useDirection } from '../hooks/useDirection';

interface FocusableCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress: () => void;
  width?: number;
  height?: number;
}

export const FocusableCard: React.FC<FocusableCardProps> = ({
  title,
  subtitle,
  imageUrl,
  onPress,
  width = 280,
  height = 160,
}) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.1,
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
      style={styles.touchable}
    >
      <Animated.View
        style={[
          styles.card,
          { width, height },
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{title?.[0] || '?'}</Text>
          </View>
        )}
        <View style={styles.overlay}>
          <Text style={[styles.title, { textAlign }]} numberOfLines={1}>
            {title || ''}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { textAlign }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginLeft: 20,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardFocused: {
    borderColor: colors.primary,
    // @ts-ignore - Web CSS property for glow effect
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: colors.overlay,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default FocusableCard;
