import React from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet } from 'react-native';
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
} from './src/screens';
import { useAuthStore } from './src/stores/authStore';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
};

export type MainTabParamList = {
  Home: undefined;
  LiveTV: undefined;
  Radio: undefined;
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
          LiveTV: '📺',
          Radio: '📻',
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
          <View
            key={route.key}
            style={[
              tabStyles.tab,
              isFocused && tabStyles.tabFocused,
            ]}
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
          </View>
        );
      })}
    </View>
  );
};

// Profile placeholder screen
const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.avatar}>
        <Text style={profileStyles.avatarText}>
          {user?.name?.[0] || '?'}
        </Text>
      </View>
      <Text style={profileStyles.name}>{user?.name || 'אורח'}</Text>
      <Text style={profileStyles.email}>{user?.email || ''}</Text>

      <View style={profileStyles.menu}>
        <View style={profileStyles.menuItem}>
          <Text style={profileStyles.menuIcon}>⚙️</Text>
          <Text style={profileStyles.menuText}>הגדרות</Text>
        </View>
        <View style={profileStyles.menuItem}>
          <Text style={profileStyles.menuIcon}>📋</Text>
          <Text style={profileStyles.menuText}>הרשימה שלי</Text>
        </View>
        <View style={profileStyles.menuItem}>
          <Text style={profileStyles.menuIcon}>🕐</Text>
          <Text style={profileStyles.menuText}>היסטוריית צפייה</Text>
        </View>
        <View style={profileStyles.menuItem}>
          <Text style={profileStyles.menuIcon}>❓</Text>
          <Text style={profileStyles.menuText}>עזרה</Text>
        </View>
      </View>
    </View>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    paddingTop: 60,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0d0d1a',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: '#888888',
    marginBottom: 40,
  },
  menu: {
    width: '60%',
    maxWidth: 500,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    fontSize: 24,
    marginLeft: 16,
  },
  menuText: {
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'right',
  },
});

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
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              animation: 'fade',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
