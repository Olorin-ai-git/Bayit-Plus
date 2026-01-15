/**
 * GlassModal - Glass-styled modal for errors, confirmations, and alerts
 * Replaces Alert.alert and console.error patterns
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../theme';

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

  const handleBackdropPress = () => {
    if (dismissable && onClose) {
      onClose();
    }
  };

  const renderButton = (button: ModalButton, index: number) => {
    const isDestructive = button.style === 'destructive';
    const isCancel = button.style === 'cancel';

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.button,
          isDestructive && styles.buttonDestructive,
          isCancel && styles.buttonCancel,
          !isDestructive && !isCancel && { backgroundColor: modalColor },
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
            <View style={styles.customHeader}>
              <Text style={[styles.dialogTitle, { marginBottom: 0, flex: 1 }]}>{title}</Text>
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
            contentContainerStyle={styles.customContentWrapper}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </>
      );
    }

    return (
      <View style={styles.contentWrapper}>
        <View style={[styles.iconContainer, { backgroundColor: modalColor + '20' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        {title && <Text style={styles.title}>{title}</Text>}

        <Text style={styles.message}>{message}</Text>

        {loading ? (
          <ActivityIndicator size="small" color={modalColor} style={styles.loader} />
        ) : (
          <View style={styles.buttonContainer}>
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
            hasCustomContent && styles.containerWide,
            styles.glassBorder,
            {
              // @ts-ignore - Web-specific CSS properties
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              backgroundColor: 'rgba(20, 20, 35, 0.92)',
            },
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: modalColor }]} />
          {renderContent()}
        </View>
      );
    }

    return (
      <LinearGradient
        colors={['rgba(30, 30, 50, 0.95)', 'rgba(20, 20, 40, 0.98)']}
        style={[styles.container, hasCustomContent && styles.containerWide, styles.glassBorder]}
      >
        <View style={[styles.accentBar, { backgroundColor: modalColor }]} />
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
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            {renderGlassContainer()}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    borderRadius: borderRadius.xl + 4,
    overflow: 'hidden',
    // @ts-ignore - Web-specific CSS
    boxShadow: Platform.OS === 'web' ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset' : undefined,
    elevation: 24,
  },
  containerWide: {
    maxWidth: 600,
  },
  glassBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  accentBar: {
    height: 3,
    width: '100%',
    // @ts-ignore - Web-specific CSS
    boxShadow: Platform.OS === 'web' ? '0 2px 8px currentColor' : undefined,
  },
  contentWrapper: {
    padding: spacing.xl * 1.5,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    // @ts-ignore - Web-specific CSS
    boxShadow: Platform.OS === 'web' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : undefined,
    elevation: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  dialogTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    maxWidth: 340,
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    // @ts-ignore - Web-specific CSS
    boxShadow: Platform.OS === 'web' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : undefined,
    elevation: 3,
  },
  buttonDestructive: {
    backgroundColor: colors.error,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    // @ts-ignore
    boxShadow: Platform.OS === 'web' ? 'none' : undefined,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.md,
  },
  scrollView: {
    maxHeight: '80vh',
    width: '100%',
  },
  customContentWrapper: {
    padding: spacing.xl,
    width: '100%',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 24,
  },
});

export default GlassModal;
