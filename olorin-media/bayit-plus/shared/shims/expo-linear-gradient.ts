/**
 * Shared Shim: expo-linear-gradient -> react-native-linear-gradient
 *
 * This shim allows code using expo-linear-gradient to work with
 * react-native-linear-gradient on TV platforms (tv-app, tvos-app).
 */
import LinearGradientRN from 'react-native-linear-gradient';

export const LinearGradient = LinearGradientRN;
export default LinearGradientRN;
