/**
 * HelpButton - Floating action button for quick access to help
 * Can be placed anywhere in the app to provide contextual help access
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type HelpAction = 'search' | 'docs' | 'faq' | 'support' | 'tutorial';

interface HelpButtonProps {
  /** Callback when help is requested */
  onHelpPress: (action: HelpAction) => void;
  /** Initial position (defaults to bottom-right) */
  initialPosition?: { x: number; y: number };
  /** Whether the button is draggable */
  draggable?: boolean;
  /** Whether to show the expanded menu */
  expandable?: boolean;
  /** Badge count for notifications */
  badgeCount?: number;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  onHelpPress,
  initialPosition,
  draggable = false,
  expandable = true,
  badgeCount,
}) => {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState(
    initialPosition || {
      x: SCREEN_WIDTH - 80,
      y: SCREEN_HEIGHT - 160,
    }
  );

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const positionAnim = useRef(new Animated.ValueXY(position)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggable,
      onMoveShouldSetPanResponder: () => draggable,
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(0, Math.min(position.x + gesture.dx, SCREEN_WIDTH - 64));
        const newY = Math.max(0, Math.min(position.y + gesture.dy, SCREEN_HEIGHT - 64));
        positionAnim.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gesture) => {
        const newX = Math.max(0, Math.min(position.x + gesture.dx, SCREEN_WIDTH - 64));
        const newY = Math.max(0, Math.min(position.y + gesture.dy, SCREEN_HEIGHT - 64));
        setPosition({ x: newX, y: newY });
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const toggleExpanded = useCallback(() => {
    if (!expandable) {
      onHelpPress('docs');
      return;
    }

    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);

    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: expanded ? 1 : 0.95,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, expandable, expandAnim, scaleAnim, onHelpPress]);

  const handleAction = useCallback(
    (action: HelpAction) => {
      onHelpPress(action);
      setExpanded(false);
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    },
    [onHelpPress, expandAnim]
  );

  const menuItems: { action: HelpAction; icon: string; labelKey: string }[] = [
    { action: 'search', icon: '🔍', labelKey: 'help.actions.search' },
    { action: 'docs', icon: '📚', labelKey: 'help.actions.docs' },
    { action: 'faq', icon: '❓', labelKey: 'help.actions.faq' },
    { action: 'support', icon: '💬', labelKey: 'help.actions.support' },
    { action: 'tutorial', icon: '🎓', labelKey: 'help.actions.tutorial' },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: positionAnim.x },
            { translateY: positionAnim.y },
          ],
        },
      ]}
      {...(draggable ? panResponder.panHandlers : {})}
    >
      {/* Expanded Menu */}
      {expandable && (
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          {menuItems.map((item, index) => (
            <Animated.View
              key={item.action}
              style={{
                opacity: expandAnim,
                transform: [
                  {
                    translateY: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10 * (menuItems.length - index), 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleAction(item.action)}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Main Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.mainButton}
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={t('help.openHelp', 'Open help menu')}
        >
          <Text style={styles.mainButtonIcon}>{expanded ? '✕' : '?'}</Text>
          {badgeCount && badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  mainButton: {
    width: isTV ? 72 : 56,
    height: isTV ? 72 : 56,
    borderRadius: isTV ? 36 : 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonIcon: {
    fontSize: isTV ? 32 : 24,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  menuContainer: {
    position: 'absolute',
    bottom: isTV ? 80 : 64,
    right: 0,
    width: 180,
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuIcon: {
    fontSize: isTV ? 20 : 18,
  },
  menuLabel: {
    fontSize: isTV ? 14 : 13,
    color: colors.text,
    fontWeight: '500',
  },
});

export default HelpButton;
