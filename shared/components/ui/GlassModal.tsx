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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.customContentWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {title && <Text style={styles.dialogTitle}>{title}</Text>}
          {children}
        </ScrollView>
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
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              backgroundColor: 'rgba(26, 26, 46, 0.95)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  containerWide: {
    maxWidth: 600,
  },
  glassBorder: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  contentWrapper: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  dialogTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonDestructive: {
    backgroundColor: colors.error,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
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
});

export default GlassModal;
