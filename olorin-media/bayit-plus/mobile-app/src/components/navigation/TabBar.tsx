/**
 * TabBar Component for Mobile Navigation
 * Uses lucide-react-native for consistent icon rendering
 */

import React from 'react';
import { Text, Pressable, View, StyleSheet, Platform } from 'react-native';
import { Home, Tv, Film, Radio, Mic, User } from 'lucide-react-native';

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
  LiveTV: 'Live TV',
  VOD: 'VOD',
  Radio: 'Radio',
  Podcasts: 'Podcasts',
  Profile: 'Profile',
};

export default function TabBar(props: TabBarProps) {
  const { state, descriptors, navigation } = props;
  const bottomPadding = Platform.OS === 'ios' ? 34 : 0;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const IconComponent = TAB_ICONS[route.name] || Home;
        const label = TAB_LABELS[route.name] || route.name;
        const iconColor = isFocused ? '#4a9eff' : '#999';

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
              {
                backgroundColor: isFocused
                  ? 'rgba(74, 158, 255, 0.2)'
                  : 'transparent',
              },
            ]}
          >
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent
                size={22}
                color={iconColor}
                strokeWidth={2}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: iconColor,
                  fontWeight: isFocused ? 'bold' : 'normal',
                },
              ]}
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
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    height: 60,
    paddingHorizontal: 5,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
