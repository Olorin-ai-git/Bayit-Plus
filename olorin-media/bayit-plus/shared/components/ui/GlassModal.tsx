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
        className={`flex-1 py-4 px-6 rounded-lg items-center shadow ${
          isDestructive ? 'bg-red-500' :
          isCancel ? 'bg-white/5 border border-white/10' :
          'bg-white/10 border border-white/20'
        }`}
        onPress={() => {
          button.onPress?.();
          onClose?.();
        }}
        disabled={loading}
      >
        <Text
          className={`text-base font-semibold ${
            isCancel ? 'text-white/70' : 'text-white font-bold'
          }`}
          style={{ letterSpacing: 0.3 }}
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
            <View className={`flex-row justify-between items-center px-6 pt-4 pb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Text className={`text-2xl font-bold text-white flex-1 ${isRTL ? 'text-right' : ''}`} style={{ marginBottom: 0 }}>{title}</Text>
              {onClose && (
                <TouchableOpacity
                  className="w-9 h-9 rounded-full bg-white/5 justify-center items-center border border-white/10 ml-4"
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-xl text-white/70 font-normal leading-6">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <ScrollView
            className="max-h-[80vh] w-full"
            contentContainerStyle={{ padding: 24, width: '100%' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {/* Render buttons for custom content modals */}
          {buttons && buttons.length > 0 && (
            <View className={`flex-row gap-4 px-6 pb-6 pt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
      <View className="p-9 pt-12 pb-6 items-center">
        <View className={`w-20 h-20 rounded-full justify-center items-center mb-4 shadow-lg`} style={{ backgroundColor: modalColor + '20' }}>
          <Text className="text-[40px]">{icon}</Text>
        </View>

        {title && <Text className="text-[28px] font-bold text-white mb-3 text-center" style={{ letterSpacing: -0.5 }}>{title}</Text>}

        <Text className="text-base text-white/70 text-center mb-6 leading-6 max-w-[340px] opacity-90">{message}</Text>

        {loading ? (
          <ActivityIndicator size="small" color={modalColor} className="mt-3" />
        ) : (
          <View className={`flex-row gap-4 w-full mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
          className={`w-full ${hasCustomContent ? 'max-w-[600px]' : 'max-w-[440px]'} rounded-2xl overflow-hidden border border-white/8 shadow-2xl`}
          style={{
            // @ts-ignore - Web-specific CSS properties
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            backgroundColor: 'rgba(20, 20, 35, 0.92)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset',
          }}
        >
          <View className="h-[3px] w-full" style={{ backgroundColor: modalColor, boxShadow: Platform.OS === 'web' ? '0 2px 8px currentColor' : undefined }} />
          {renderContent()}
        </View>
      );
    }

    return (
      <LinearGradient
        colors={['rgba(30, 30, 50, 0.95)', 'rgba(20, 20, 40, 0.98)']}
        className={`w-full ${hasCustomContent ? 'max-w-[600px]' : 'max-w-[440px]'} rounded-2xl overflow-hidden border border-white/8 shadow-2xl`}
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
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View className="flex-1 bg-black/75 justify-center items-center p-6">
          <TouchableWithoutFeedback>
            {renderGlassContainer()}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};


export default GlassModal;
