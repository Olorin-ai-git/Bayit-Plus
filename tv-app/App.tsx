import React from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  HomeScreen,
  PlayerScreen,
  LoginScreen,
  LiveTVScreen,
  RadioScreen,
  VODScreen,
  PodcastsScreen,
  SearchScreen,
  RegisterScreen,
  ProfileScreen,
} from './src/screens';
import { useAuthStore } from './src/stores/authStore';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
  Search: { query?: string };
  Subscribe: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  VOD: undefined;
  LiveTV: undefined;
  Radio: undefined;
  Podcasts: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar for TV
const TVTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  return (
    <View style={tabStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const icon = {
          Home: '🏠',
          VOD: '🎬',
          LiveTV: '📺',
          Radio: '📻',
          Podcasts: '🎙️',
          Profile: '👤',
        }[route.name] || '•';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[
              tabStyles.tab,
              isFocused && tabStyles.tabFocused,
            ]}
            activeOpacity={0.7}
          >
            <Text style={tabStyles.icon}>{icon}</Text>
            <Text
              style={[
                tabStyles.label,
                isFocused && tabStyles.labelFocused,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TVTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'ראשי' }}
      />
      <Tab.Screen
        name="VOD"
        component={VODScreen}
        options={{ tabBarLabel: 'סרטים' }}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{ tabBarLabel: 'שידור חי' }}
      />
      <Tab.Screen
        name="Radio"
        component={RadioScreen}
        options={{ tabBarLabel: 'רדיו' }}
      />
      <Tab.Screen
        name="Podcasts"
        component={PodcastsScreen}
        options={{ tabBarLabel: 'פודקאסטים' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'פרופיל' }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0a0a14',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingVertical: 8,
    paddingHorizontal: 48,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  icon: {
    fontSize: 28,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    color: '#666666',
  },
  labelFocused: {
    color: '#00d9ff',
    fontWeight: 'bold',
  },
});

function App(): React.JSX.Element {
  // Skip auth check for demo - go directly to Main
  // const { isAuthenticated } = useAuthStore();

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, direction: 'rtl' }}>
      <NavigationContainer>
        <StatusBar hidden />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#0d0d1a' },
          }}
          initialRouteName={'Main'}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen name="Search" component={SearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

export default App;
