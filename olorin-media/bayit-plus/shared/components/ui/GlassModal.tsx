/**
 * GlassModal - Glass-styled modal for errors, confirmations, and alerts
 * Replaces Alert.alert and console.error patterns
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
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

export type ModalType = 'error' | 'success' | 'warning' | 'info' | 'confirm';

export interface ModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GlassModalProps {
  visible: boolean;
  type?: ModalType;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  buttons?: ModalButton[];
  onClose?: () => void;
  loading?: boolean;
  dismissable?: boolean;
  showCloseButton?: boolean;
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
}) => {
  const modalColor = getColorForType(type);
  const icon = getIconForType(type);
  const hasCustomContent = !!children;

  // Detect RTL from I18nManager or document direction (web)
  const isRTL = I18nManager.isRTL || (Platform.OS === 'web' && typeof document !== 'undefined' && document.dir === 'rtl');

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
        style={[
          styles.button,
          isDestructive && styles.buttonDestructive,
          isCancel && styles.buttonCancel,
          isPrimary && styles.buttonPrimary,
        ]}
        onPress={() => {
          button.onPress?.();
          onClose?.();
        }}
        disabled={loading}
      >
        <Text
          style={[
            styles.buttonText,
            isCancel && styles.buttonTextCancel,
            !isCancel && styles.buttonTextBold,
          ]}
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
            <View style={[styles.customHeader, isRTL && styles.customHeaderRTL]}>
              <Text style={[styles.customHeaderTitle, isRTL && styles.textRight]}>{title}</Text>
              {onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {/* Render buttons for custom content modals */}
          {buttons && buttons.length > 0 && (
            <View style={[styles.customButtonRow, isRTL && styles.customButtonRowRTL]}>
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
      <View style={styles.standardContent}>
        <View style={[styles.iconContainer, { backgroundColor: modalColor + '20' }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        {title && <Text style={styles.standardTitle}>{title}</Text>}

        <Text style={styles.standardMessage}>{message}</Text>

        {loading ? (
          <ActivityIndicator size="small" color={modalColor} style={styles.loader} />
        ) : (
          <View style={[styles.standardButtonRow, isRTL && styles.standardButtonRowRTL]}>
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
          style={[
            styles.container,
            hasCustomContent ? styles.containerWide : styles.containerNarrow,
            {
              // @ts-ignore - Web-specific CSS properties
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              backgroundColor: 'rgba(20, 20, 35, 0.92)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset',
            }
          ]}
        >
          <View style={[styles.topBar, { backgroundColor: modalColor }]} />
          {renderContent()}
        </View>
      );
    }

    return (
      <LinearGradient
        colors={['rgba(30, 30, 50, 0.95)', 'rgba(20, 20, 40, 0.98)']}
        style={[
          styles.container,
          hasCustomContent ? styles.containerWide : styles.containerNarrow,
        ]}
      >
        <View style={[styles.topBar, { backgroundColor: modalColor }]} />
        {renderContent()}
      </LinearGradient>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent={true}
      supportedOrientations={['portrait', 'landscape']}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={[
          styles.backdrop,
          Platform.OS === 'web' && {
            // @ts-ignore - Web-specific CSS properties
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }
        ]}>
          <TouchableWithoutFeedback>
            {renderGlassContainer()}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  containerNarrow: {
    maxWidth: 440,
  },
  containerWide: {
    maxWidth: 600,
  },
  topBar: {
    height: 3,
    width: '100%',
  },

  // Standard content (simple modals)
  standardContent: {
    padding: spacing.xl,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 40,
  },
  standardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  standardMessage: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
    maxWidth: 340,
    opacity: 0.9,
  },
  standardButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  standardButtonRowRTL: {
    flexDirection: 'row-reverse',
  },
  loader: {
    marginTop: spacing.sm,
  },

  // Custom content (modals with children)
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  customHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  customHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  textRight: {
    textAlign: 'right',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: spacing.md,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
  },
  scrollView: {
    maxHeight: '80vh' as any,
    width: '100%',
  },
  scrollViewContent: {
    padding: spacing.lg,
    width: '100%',
  },
  customButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  customButtonRowRTL: {
    flexDirection: 'row-reverse',
  },

  // Buttons
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDestructive: {
    backgroundColor: colors.error.DEFAULT,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  },
  buttonTextCancel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  buttonTextBold: {
    fontWeight: 'bold',
  },
});

export default GlassModal;
