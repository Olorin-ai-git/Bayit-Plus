import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

interface FocusableWrapperProps {
  children: React.ReactNode | ((props: { focused: boolean }) => React.ReactNode);
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  focusKey?: string;
  style?: ViewStyle;
  focusedStyle?: ViewStyle;
  isFocusBoundary?: boolean;
  focusBoundaryDirections?: ('up' | 'down' | 'left' | 'right')[];
  preferredChildFocusKey?: string;
  autoRestoreFocus?: boolean;
  extraProps?: Record<string, unknown>;
}

export const FocusableWrapper: React.FC<FocusableWrapperProps> = ({
  children,
  onPress,
  onFocus,
  onBlur,
  focusKey,
  style,
  focusedStyle,
  isFocusBoundary = false,
  focusBoundaryDirections,
  preferredChildFocusKey,
  autoRestoreFocus = true,
  extraProps,
}) => {
  const {
    ref,
    focused,
    hasFocusedChild,
    focusSelf,
    focusKey: assignedFocusKey,
  } = useFocusable({
    onEnterPress: onPress,
    onFocus,
    onBlur,
    focusKey,
    isFocusBoundary,
    focusBoundaryDirections,
    preferredChildFocusKey,
    autoRestoreFocus,
    extraProps,
  });

  return (
    <FocusContext.Provider value={{ focusKey: assignedFocusKey, focusSelf, hasFocusedChild }}>
      <View ref={ref} style={[style, focused && focusedStyle]}>
        {typeof children === 'function' ? children({ focused }) : children}
      </View>
    </FocusContext.Provider>
  );
};

export default FocusableWrapper;
