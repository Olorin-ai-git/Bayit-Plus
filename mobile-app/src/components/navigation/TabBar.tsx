/**
 * TabBar Component for Mobile Navigation
 * Uses lucide-react-native for consistent icon rendering
 */

import React from 'react';
import { Text, Pressable, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Tv, Film, Radio, Mic, User } from 'lucide-react-native';

// Design tokens - purple theme
const COLORS = {
  primary: '#9333ea',
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

// Map route names to lucide icon components
const TAB_ICONS: Record<string, React.FC<any>> = {
  Home: Home,
  LiveTV: Tv,
  VOD: Film,
  Radio: Radio,
  Podcasts: Mic,
  Profile: User,
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
        const IconComponent = TAB_ICONS[route.name] || Home;
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
            <IconComponent
              size={20}
              color={iconColor}
              strokeWidth={isFocused ? 2.5 : 2}
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
