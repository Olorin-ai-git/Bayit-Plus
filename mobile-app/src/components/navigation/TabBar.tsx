/**
 * TabBar Component for Mobile Navigation
 * Uses unified icon registry from @olorin/shared-icons for consistent rendering
 */

import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeIcon } from '@olorin/shared-icons/native';

// Design tokens - purple theme
const COLORS = {
  primary: '#7e22ce',
  primaryBg: 'rgba(126, 34, 206, 0.2)',
  inactive: 'rgba(255, 255, 255, 0.5)',
  background: 'rgba(10, 10, 10, 0.95)',
  border: 'rgba(126, 34, 206, 0.2)',
};

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

// Map route names to icon registry names
const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  LiveTV: 'live',
  VOD: 'vod',
  Radio: 'radio',
  Podcasts: 'podcasts',
  Profile: 'profile',
};

// Tab labels for display
const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  LiveTV: 'Live',
  VOD: 'VOD',
  Radio: 'Radio',
  Podcasts: 'Pods',
  Profile: 'Profile',
};

export default function TabBar(props: TabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const iconName = TAB_ICONS[route.name] || 'home';
        const label = TAB_LABELS[route.name] || route.name;
        const iconColor = isFocused ? COLORS.primary : COLORS.inactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            preventDefault: () => {},
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            style={[
              styles.tab,
              isFocused && styles.tabFocused,
            ]}
          >
            <NativeIcon
              name={iconName}
              size="sm"
              color={iconColor}
              variant={isFocused ? 'colored' : 'monochrome'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: iconColor },
                isFocused && styles.tabLabelFocused,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  tabFocused: {
    backgroundColor: COLORS.primaryBg,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelFocused: {
    fontWeight: '600',
  },
});
