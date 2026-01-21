/**
 * HelpButton - Floating action button for quick access to help
 * Can be placed anywhere in the app to provide contextual help access
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
      className="absolute z-[1000]"
      style={{
        transform: [
          { translateX: positionAnim.x },
          { translateY: positionAnim.y },
        ],
      }}
      {...(draggable ? panResponder.panHandlers : {})}
    >
      {/* Expanded Menu */}
      {expandable && (
        <Animated.View
          className={`absolute right-0 w-[180px] bg-[rgba(30,30,40,0.98)] rounded-lg p-2 border border-white/10 shadow-lg ${
            isTV ? 'bottom-20' : 'bottom-16'
          }`}
          style={{
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
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
                className="flex-row items-center gap-2 p-3 rounded-md"
                onPress={() => handleAction(item.action)}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
              >
                <Text className={isTV ? 'text-xl' : 'text-lg'}>{item.icon}</Text>
                <Text className={`text-white font-medium ${isTV ? 'text-sm' : 'text-[13px]'}`}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Main Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          className={`items-center justify-center bg-purple-500 shadow-lg ${
            isTV ? 'w-[72px] h-[72px] rounded-[36px]' : 'w-14 h-14 rounded-[28px]'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={t('help.openHelp', 'Open help menu')}
        >
          <Text className={`text-white font-bold ${isTV ? 'text-[32px]' : 'text-2xl'}`}>{expanded ? '✕' : '?'}</Text>
          {badgeCount && badgeCount > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 items-center justify-center px-1.5">
              <Text className="text-white text-xs font-bold">
                {badgeCount > 9 ? '9+' : badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default HelpButton;
