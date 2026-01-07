import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../theme';
import { isTV } from '../../utils/platform';

interface WatchPartyButtonProps {
  hasActiveParty: boolean;
  onCreatePress: () => void;
  onJoinPress: () => void;
  onPanelToggle: () => void;
  hasTVPreferredFocus?: boolean;
}

export const WatchPartyButton: React.FC<WatchPartyButtonProps> = ({
  hasActiveParty,
  onCreatePress,
  onJoinPress,
  onPanelToggle,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (hasActiveParty) {
      onPanelToggle();
    } else {
      setMenuVisible(!menuVisible);
    }
  };

  if (hasActiveParty) {
    return (
      <TouchableOpacity
        onPress={onPanelToggle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          style={[
            { transform: [{ scale: scaleAnim }] },
            isFocused && shadows.glow(colors.success),
          ]}
        >
          <GlassView
            style={styles.activeButton}
            intensity="medium"
            borderColor={colors.success}
          >
            <Text style={styles.activeIcon}>👥</Text>
            <Text style={styles.activeText}>{t('watchParty.active')}</Text>
            <View style={styles.activeDot} />
          </GlassView>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          style={[
            { transform: [{ scale: scaleAnim }] },
            isFocused && shadows.glow(colors.primary),
          ]}
        >
          <GlassView
            style={styles.button}
            intensity="medium"
            borderColor={isFocused ? colors.primary : undefined}
          >
            <Text style={styles.icon}>👥</Text>
            <Text style={styles.text}>{t('watchParty.title')}</Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {menuVisible && (
        <GlassView style={styles.menu} intensity="high">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              onCreatePress();
            }}
          >
            <Text style={styles.menuIcon}>➕</Text>
            <Text style={styles.menuText}>{t('watchParty.create')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              onJoinPress();
            }}
          >
            <Text style={styles.menuIcon}>🔗</Text>
            <Text style={styles.menuText}>{t('watchParty.join')}</Text>
          </TouchableOpacity>
        </GlassView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  icon: {
    fontSize: fontSize.md,
  },
  activeIcon: {
    fontSize: fontSize.md,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  activeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.success,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  menu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: spacing.sm,
    minWidth: 160,
    padding: spacing.xs,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  menuIcon: {
    fontSize: fontSize.md,
  },
  menuText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});

export default WatchPartyButton;
