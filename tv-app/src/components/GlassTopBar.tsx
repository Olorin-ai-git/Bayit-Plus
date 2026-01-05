import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from './ui';
import { LanguageSelector } from './LanguageSelector';
import { UserAccountMenu } from './UserAccountMenu';
import { VoiceSearchButton } from './VoiceSearchButton';
import { colors, spacing, borderRadius } from '../theme';
import { isWeb } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

const logo = require('../assets/logo.png');

interface GlassTopBarProps {
  onMenuPress?: () => void;
  sidebarExpanded?: boolean;
}

export const GlassTopBar: React.FC<GlassTopBarProps> = ({ onMenuPress, sidebarExpanded = false }) => {
  const navigation = useNavigation<any>();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { isRTL } = useDirection();

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const sidebarWidth = sidebarExpanded ? 280 : 80;
  const sidebarPadding = sidebarWidth + spacing.lg;

  return (
    <GlassView intensity="medium" style={[
      styles.container,
      { flexDirection: isRTL ? 'row' : 'row-reverse' },
      isRTL ? { paddingRight: sidebarPadding } : { paddingLeft: sidebarPadding },
    ]}>
      {/* Actions side */}
      <View style={[styles.actionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Voice Search Button */}
        <VoiceSearchButton onResult={(text) => {
          navigation.navigate('Search', { query: text });
        }} />

        {/* Search Button */}
        <TouchableOpacity
          onPress={handleSearchPress}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          style={[styles.actionButton, isSearchFocused && styles.actionButtonFocused]}
        >
          <Text style={styles.actionIcon}>🔍</Text>
        </TouchableOpacity>

        {/* Language Selector */}
        <LanguageSelector />

        {/* User Account Menu */}
        <UserAccountMenu />
      </View>

      {/* Center - Logo */}
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={styles.logoTextContainer}>
          <Text style={styles.logoText}>בית</Text>
          <Text style={styles.logoPlus}>+</Text>
        </View>
      </View>

      {/* Right side (RTL) - Menu button (hidden on web) */}
      {!isWeb && (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuButton}
          onFocus={() => {}}
          onBlur={() => {}}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg, // Dynamic padding applied in component
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    fontSize: 24,
    color: colors.text,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -60 }],
  },
  logo: {
    width: 40,
    height: 20,
    marginRight: 4,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoPlus: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 2,
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: '100%',
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  actionIcon: {
    fontSize: 20,
  },
});

export default GlassTopBar;
