/**
 * GlassModal Component
 *
 * Glass-styled modal for errors, confirmations, and alerts.
 * Replaces Alert.alert patterns with a consistent glassmorphic UI.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  ScrollView,
  I18nManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export type ModalType = 'error' | 'success' | 'warning' | 'info' | 'confirm';

export interface ModalButton {
  /** Button text */
  text: string;
  /** Press handler */
  onPress?: () => void;
  /** Button style variant */
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GlassModalProps {
  /** Modal visibility */
  visible: boolean;
  /** Modal type for icon and color */
  type?: ModalType;
  /** Modal title */
  title?: string;
  /** Modal message */
  message?: string;
  /** Custom modal content */
  children?: React.ReactNode;
  /** Action buttons */
  buttons?: ModalButton[];
  /** Close handler */
  onClose?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Allow dismiss by tapping backdrop */
  dismissable?: boolean;
  /** Test ID for testing */
  testID?: string;
}

const getIconForType = (type: ModalType): string => {
  const icons: Record<ModalType, string> = {
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
    confirm: '❓',
  };
  return icons[type];
};

const getColorForType = (type: ModalType): string => {
  const typeColors: Record<ModalType, string> = {
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.primary,
    confirm: colors.secondary,
  };
  return typeColors[type];
};

/**
 * Glassmorphic modal component
 */
export const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  children,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  loading = false,
  dismissable = true,
  testID,
}) => {
  const modalColor = getColorForType(type);
  const icon = getIconForType(type);
  const hasCustomContent = !!children;

  // Detect RTL from I18nManager or document direction (web)
  const isRTL =
    I18nManager.isRTL ||
    (Platform.OS === 'web' && typeof document !== 'undefined' && document.dir === 'rtl');

  const handleBackdropPress = () => {
    if (dismissable && onClose) {
      onClose();
    }
  };

  const renderButton = (button: ModalButton, index: number) => {
    const isDestructive = button.style === 'destructive';
    const isCancel = button.style === 'cancel';
    const isPrimary = !isDestructive && !isCancel;

    return (
      <TouchableOpacity
        key={index}
        className={`flex-1 items-center rounded-lg ${
          isDestructive
            ? ''
            : isCancel
              ? 'bg-white/5 border border-[rgba(255,255,255,0.12)]'
              : 'bg-white/10 border border-white/20'
        }`}
        style={[
          {
            paddingVertical: spacing.md + 4,
            paddingHorizontal: spacing.lg,
          },
          isDestructive && { backgroundColor: colors.error },
        ]}
        onPress={() => {
          button.onPress?.();
          onClose?.();
        }}
        disabled={loading}
      >
        <Text
          className={`text-base tracking-wide ${
            isCancel ? '' : isPrimary ? 'font-bold' : 'font-semibold'
          }`}
          style={{
            color: isCancel ? colors.textSecondary : colors.text,
          }}
        >
          {button.text}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render content based on mode
  const renderContent = () => {
    if (hasCustomContent) {
      return (
        <>
          {/* Header with close button for custom content */}
          {title && (
            <View
              className="justify-between items-center"
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                paddingHorizontal: spacing.xl,
                paddingTop: spacing.lg,
                paddingBottom: spacing.md,
              }}
            >
              <Text
                className="flex-1 font-bold text-center"
                style={{
                  fontSize: fontSize.xl,
                  color: colors.text,
                  textAlign: isRTL ? 'right' : 'left',
                  marginBottom: 0,
                }}
              >
                {title}
              </Text>
              {onClose && (
                <TouchableOpacity
                  className="w-9 h-9 rounded-full bg-white/5 justify-center items-center border border-white/10"
                  style={{ marginLeft: spacing.md }}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-xl leading-6" style={{ color: colors.textSecondary }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView
            className="max-h-[500px] w-full"
            contentContainerStyle={{ padding: spacing.xl, width: '100%' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {/* Render buttons for custom content modals */}
          {buttons && buttons.length > 0 && (
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: spacing.md,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl,
                paddingTop: spacing.md,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={modalColor} />
              ) : (
                buttons.map(renderButton)
              )}
            </View>
          )}
        </>
      );
    }

    return (
      <View
        className="items-center"
        style={{
          padding: spacing.xl * 1.5,
          paddingTop: spacing.xl * 2,
          paddingBottom: spacing.xl,
        }}
      >
        <View
          className="w-20 h-20 rounded-full justify-center items-center"
          style={{
            backgroundColor: modalColor + '20',
            marginBottom: spacing.lg,
          }}
        >
          <Text className="text-[40px]">{icon}</Text>
        </View>

        {title && (
          <Text
            className="text-center font-bold tracking-tight"
            style={{
              fontSize: 28,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            {title}
          </Text>
        )}

        <Text
          className="text-base text-center leading-6 max-w-[340px] opacity-90"
          style={{ color: colors.textSecondary, marginBottom: spacing.xl }}
        >
          {message}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={modalColor} style={{ marginTop: spacing.md }} />
        ) : (
          <View
            className="w-full"
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: spacing.md,
              marginTop: spacing.sm,
            }}
          >
            {buttons.map(renderButton)}
          </View>
        )}
      </View>
    );
  };

  // Platform-specific glass implementation
  const renderGlassContainer = () => {
    if (Platform.OS === 'web') {
      return (
        <View
          className={`w-full overflow-hidden border border-white/8 ${
            hasCustomContent ? 'max-w-[600px]' : 'max-w-[440px]'
          }`}
          style={{
            borderRadius: borderRadius.xl + 4,
            // @ts-expect-error Web-specific CSS properties
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            backgroundColor: 'rgba(20, 20, 35, 0.92)',
          }}
        >
          <View className="h-[3px] w-full" style={{ backgroundColor: modalColor }} />
          {renderContent()}
        </View>
      );
    }

    return (
      <LinearGradient
        colors={['rgba(30, 30, 50, 0.95)', 'rgba(20, 20, 40, 0.98)']}
        className={`w-full overflow-hidden border border-white/8 ${
          hasCustomContent ? 'max-w-[600px]' : 'max-w-[440px]'
        }`}
        style={{ borderRadius: borderRadius.xl + 4 }}
      >
        <View className="h-[3px] w-full" style={{ backgroundColor: modalColor }} />
        {renderContent()}
      </LinearGradient>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View
          className="flex-1 justify-center items-center bg-black/75"
          style={{ padding: spacing.lg }}
        >
          <TouchableWithoutFeedback>{renderGlassContainer()}</TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default GlassModal;
