import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TVFocusGuideView,
} from 'react-native';

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
            <Text style={styles.placeholderText}>{title[0]}</Text>
          </View>
        )}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
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
    backgroundColor: '#1a1a2e',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaaaaa',
    marginTop: 2,
    textAlign: 'right',
  },
});

export default FocusableCard;
