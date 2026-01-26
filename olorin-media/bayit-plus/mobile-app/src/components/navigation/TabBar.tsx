import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function TabBar(props: TabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();

  const tabLabels: Record<string, string> = {
    Home: '🏠 Home',
    LiveTV: '📺 Live TV',
    VOD: '🎬 VOD',
    Radio: '📻 Radio',
    Podcasts: '🎙️ Podcasts',
    Profile: '👤 Profile',
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

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
            style={[
              styles.tab,
              {
                backgroundColor: isFocused
                  ? 'rgba(74, 158, 255, 0.2)'
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? '#4a9eff' : '#999',
                  fontWeight: isFocused ? 'bold' : 'normal',
                },
              ]}
            >
              {tabLabels[route.name] || route.name}
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
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
