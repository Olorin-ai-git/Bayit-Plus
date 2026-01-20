/**
 * HelpTooltip - Contextual tooltip for explaining UI elements
 * Provides on-demand help without navigating away from the current screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
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
          style={[styles.triggerContainer, { flexDirection }]}
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel={t('help.openTooltip', 'Open help tooltip')}
        >
          {children}
          {showIndicator && (
            <View style={styles.helpIndicator}>
              <Text style={styles.helpIndicatorText}>?</Text>
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
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Animated.View
            style={[
              styles.tooltipContainer,
              getTooltipStyle(),
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.tooltipContent}>
              <Text style={[styles.tooltipTitle, { textAlign }]}>
                {t(titleKey)}
              </Text>
              <Text style={[styles.tooltipText, { textAlign }]}>
                {t(contentKey)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  helpIndicator: {
    width: isTV ? 20 : 16,
    height: isTV ? 20 : 16,
    borderRadius: isTV ? 10 : 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIndicatorText: {
    fontSize: isTV ? 12 : 10,
    fontWeight: '700',
    color: colors.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltipContainer: {
    backgroundColor: 'rgba(30, 30, 40, 0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipContent: {
    padding: spacing.md,
  },
  tooltipTitle: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tooltipText: {
    fontSize: isTV ? 14 : 13,
    color: colors.textSecondary,
    lineHeight: isTV ? 22 : 20,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default HelpTooltip;
