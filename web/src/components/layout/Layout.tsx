import { View, StyleSheet } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '../chat/Chatbot';
import { colors } from '@bayit/shared/theme';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function Layout() {
  return (
    <View style={styles.container}>
      {/* Decorative blur circles - wrapped to contain overflow */}
      <View style={styles.blurContainer}>
        <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
        <View style={[styles.blurCircle, styles.blurCirclePurple]} />
        <View style={[styles.blurCircle, styles.blurCircleSuccess]} />
      </View>

      <Header />
      <View style={styles.main}>
        <Outlet />
      </View>
      {!IS_TV_BUILD && <Footer />}
      {!IS_TV_BUILD && <Chatbot />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: colors.background,
    position: 'relative',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none' as any,
    zIndex: 0,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore - Web CSS property
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 384,
    height: 384,
    top: -192,
    right: -192,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 288,
    height: 288,
    top: '33%' as any,
    left: -144,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  blurCircleSuccess: {
    width: 256,
    height: 256,
    bottom: '25%' as any,
    right: '25%' as any,
    backgroundColor: colors.success,
    opacity: 0.3,
  },
  main: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
});
