/**
 * Expo Linear Gradient Platform Shim for React Native
 *
 * Maps expo-linear-gradient imports to react-native-linear-gradient.
 * The expo package is web-only; this provides the native equivalent.
 */

import RNLinearGradient from 'react-native-linear-gradient';

export const LinearGradient = RNLinearGradient;
export default RNLinearGradient;
