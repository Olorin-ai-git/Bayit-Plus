/**
 * NativeWind Type Augmentation
 *
 * Adds className prop support to React Native components for TailwindCSS styling.
 * This enables type-safe usage of className with View, Text, Pressable, etc.
 */

/// <reference types="react" />
/// <reference types="react-native" />

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface ImageProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
  }

  interface TouchableOpacityProps {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface FlatListProps<ItemT> {
    className?: string;
  }

  interface SectionListProps<ItemT, SectionT> {
    className?: string;
  }

  interface InputAccessoryViewProps {
    className?: string;
  }

  interface KeyboardAvoidingViewProps {
    className?: string;
  }

  interface ModalProps {
    className?: string;
  }

  interface SafeAreaViewProps {
    className?: string;
  }

  interface ActivityIndicatorProps {
    className?: string;
  }

  interface ButtonProps {
    className?: string;
  }

  interface SwitchProps {
    className?: string;
  }

  interface TextInputProps {
    className?: string;
  }
}
