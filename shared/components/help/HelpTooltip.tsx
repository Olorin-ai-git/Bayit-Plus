/**
 * HelpTooltip - Contextual tooltip for explaining UI elements
 * Provides on-demand help without navigating away from the current screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface HelpTooltipProps {
  /** i18n key or string for tooltip title */
  titleKey: string;
  /** i18n key or string for tooltip content */
  contentKey: string;
  /** Position relative to the trigger element */
  position?: TooltipPosition;
  /** Child element that triggers the tooltip */
  children: React.ReactNode;
  /** Whether to show the help icon indicator */
  showIndicator?: boolean;
  /** Callback when tooltip is opened */
  onOpen?: () => void;
  /** Callback when tooltip is closed */
  onClose?: () => void;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  titleKey,
  contentKey,
  position = 'bottom',
  children,
  showIndicator = true,
  onOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [visible, setVisible] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const triggerRef = useRef<View>(null);

  const handleOpen = useCallback(() => {
    setVisible(true);
    onOpen?.();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, onOpen]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onClose?.();
    });
  }, [fadeAnim, scaleAnim, onClose]);

  const measureTrigger = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
    });
  }, []);

  const getTooltipStyle = () => {
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const offset = 8;

    let top = triggerLayout.y;
    let left = triggerLayout.x;

    switch (position) {
      case 'top':
        top = triggerLayout.y - tooltipHeight - offset;
        left = triggerLayout.x + (triggerLayout.width - tooltipWidth) / 2;
        break;
      case 'bottom':
        top = triggerLayout.y + triggerLayout.height + offset;
        left = triggerLayout.x + (triggerLayout.width - tooltipWidth) / 2;
        break;
      case 'left':
        top = triggerLayout.y + (triggerLayout.height - tooltipHeight) / 2;
        left = triggerLayout.x - tooltipWidth - offset;
        break;
      case 'right':
        top = triggerLayout.y + (triggerLayout.height - tooltipHeight) / 2;
        left = triggerLayout.x + triggerLayout.width + offset;
        break;
    }

    return {
      position: 'absolute' as const,
      top,
      left,
      width: tooltipWidth,
    };
  };

  return (
    <>
      <View ref={triggerRef} onLayout={measureTrigger}>
        <TouchableOpacity
          className="items-center gap-1"
          style={{ flexDirection }}
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel={t('help.openTooltip', 'Open help tooltip')}
        >
          {children}
          {showIndicator && (
            <View className={`items-center justify-center bg-purple-500 ${isTV ? 'w-5 h-5 rounded-[10px]' : 'w-4 h-4 rounded-lg'}`}>
              <Text className={`text-white font-bold ${isTV ? 'text-xs' : 'text-[10px]'}`}>?</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
          <Animated.View
            className="bg-[rgba(30,30,40,0.95)] rounded-lg border border-white/10 shadow-lg"
            style={[
              getTooltipStyle(),
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              },
            ]}
          >
            <View className="p-3">
              <Text className={`text-white font-bold mb-1 ${isTV ? 'text-lg' : 'text-base'}`} style={{ textAlign }}>
                {t(titleKey)}
              </Text>
              <Text className={`text-white/70 ${isTV ? 'text-sm leading-[22px]' : 'text-[13px] leading-5'}`} style={{ textAlign }}>
                {t(contentKey)}
              </Text>
            </View>
            <TouchableOpacity
              className="absolute top-1 right-1 w-6 h-6 items-center justify-center"
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Text className="text-white/70 text-sm">✕</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

export default HelpTooltip;
