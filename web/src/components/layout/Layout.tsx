import { View, StyleSheet } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '../chat/Chatbot';
import { colors } from '@bayit/shared/theme';

export default function Layout() {
  return (
    <View style={styles.container}>
      {/* Decorative blur circles */}
      <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
      <View style={[styles.blurCircle, styles.blurCirclePurple]} />
      <View style={[styles.blurCircle, styles.blurCircleSuccess]} />

      <Header />
      <View style={styles.main}>
        <Outlet />
      </View>
      <Footer />
      <Chatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
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
