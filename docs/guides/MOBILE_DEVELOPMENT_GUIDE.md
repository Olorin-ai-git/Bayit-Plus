# Mobile Development Guide (iOS & Android)

**Stack:** React Native + TypeScript + StyleSheet + AsyncStorage + Detox
**Platforms:** iOS 16+ | Android 10+
**Last Updated:** 2026-01-30

## Overview

This guide covers mobile app development for iOS and Android using React Native. The app provides a native experience with platform-specific optimizations.

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.73+ | Mobile framework |
| **TypeScript** | 5.0+ | Type safety |
| **React Navigation** | 6.x | Navigation |
| **AsyncStorage** | 1.21+ | Local storage |
| **React Native Gesture Handler** | 2.14+ | Gestures |
| **React Native Reanimated** | 3.6+ | Animations |
| **Detox** | 20+ | E2E testing |
| **Jest** | 29+ | Unit testing |

---

## Project Structure

```
mobile-app/
├── src/
│   ├── screens/            # Screen components
│   ├── components/         # Reusable components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API services
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utilities
│   ├── types/              # TypeScript types
│   └── config/             # Configuration
├── ios/                    # iOS native code
│   ├── BayitPlus/
│   └── BayitPlus.xcodeproj
├── android/                # Android native code
│   ├── app/
│   └── build.gradle
├── __tests__/              # Tests
│   ├── unit/
│   └── e2e/
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

---

## Getting Started

### Prerequisites

**iOS Development:**
```bash
# Install Xcode 15+
# Install CocoaPods
sudo gem install cocoapods

# Install iOS dependencies
cd mobile-app/ios
pod install
cd ..
```

**Android Development:**
```bash
# Install Android Studio
# Install Android SDK 33+
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Installation

```bash
cd mobile-app
npm install
```

### Running on iOS

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on specific device
npm run ios -- --device "John's iPhone"
```

### Running on Android

```bash
# Start Metro bundler
npm start

# Run on Android emulator
npm run android

# Run on physical device
# Enable USB debugging on device
npm run android
```

---

## Component Patterns

### Screen Component

```typescript
// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { ContentCard } from '@/components/ContentCard';
import { contentService } from '@/services/contentService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [content, setContent] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await contentService.getAll({ limit: 20 });
      setContent(data.data);
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleContentPress = (id: string) => {
    navigation.navigate('ContentDetail', { id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={content}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ContentCard
            content={item}
            onPress={() => handleContentPress(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    padding: 16,
  },
});
```

### Reusable Component

```typescript
// src/components/ContentCard.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Content } from '@/types/content';

interface Props {
  content: Content;
  onPress: () => void;
}

export const ContentCard: React.FC<Props> = ({ content, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: content.thumbnail }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {content.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {content.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
});
```

---

## Navigation

### Navigation Configuration

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/HomeScreen';
import { ContentDetailScreen } from '@/screens/ContentDetailScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { useAuthStore } from '@/stores/authStore';

export type RootStackParamList = {
  Home: undefined;
  ContentDetail: { id: string };
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Bayit+' }}
            />
            <Stack.Screen
              name="ContentDetail"
              component={ContentDetailScreen}
              options={{ title: 'Content' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

---

## Styling

### StyleSheet Best Practices

```typescript
// ✅ GOOD - Use StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});

<View style={styles.container}>
  <Text style={styles.text}>Hello</Text>
</View>

// ✅ GOOD - Combine styles
<View style={[styles.container, styles.centered]} />

// ✅ GOOD - Conditional styles
<View style={[styles.container, isActive && styles.active]} />

// ❌ BAD - Inline styles
<View style={{ padding: 16, backgroundColor: '#000' }} />

// ❌ BAD - Don't use Tailwind classes
<View className="p-4 bg-black" /> // Doesn't work in React Native
```

### Platform-Specific Styles

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

---

## Local Storage (AsyncStorage)

### Storing Data

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store string
await AsyncStorage.setItem('key', 'value');

// Store object
await AsyncStorage.setItem('user', JSON.stringify({ id: '123', name: 'John' }));

// Store multiple items
await AsyncStorage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);
```

### Retrieving Data

```typescript
// Get string
const value = await AsyncStorage.getItem('key');

// Get object
const userJson = await AsyncStorage.getItem('user');
const user = userJson ? JSON.parse(userJson) : null;

// Get multiple items
const values = await AsyncStorage.multiGet(['key1', 'key2']);
// Returns: [['key1', 'value1'], ['key2', 'value2']]
```

### Removing Data

```typescript
// Remove single item
await AsyncStorage.removeItem('key');

// Remove multiple items
await AsyncStorage.multiRemove(['key1', 'key2']);

// Clear all data
await AsyncStorage.clear();
```

---

## Gestures & Animations

### Gesture Handler

```typescript
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const SwipeableCard = () => {
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: () => {
      if (Math.abs(translateX.value) > 100) {
        // Swipe threshold reached
        translateX.value = translateX.value > 0 ? 300 : -300;
      } else {
        // Return to center
        translateX.value = 0;
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Swipe me!</Text>
      </Animated.View>
    </PanGestureHandler>
  );
};
```

### Animations

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedButton = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text>Press Me</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
```

---

## Platform-Specific Code

### Platform Module

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
}

// Platform version
if (Platform.Version >= 33) {
  // Android API 33+ or iOS 16+
}
```

### Platform-Specific Files

```
src/components/
├── Button.ios.tsx      # iOS implementation
├── Button.android.tsx  # Android implementation
└── Button.tsx          # Fallback/shared
```

**Usage:**
```typescript
// Automatically imports correct file
import { Button } from './components/Button';
```

---

## Permissions

### Camera Permission

```typescript
import { PermissionsAndroid, Platform } from 'react-native';
import { Camera } from 'react-native-camera';

const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS handles permissions in Info.plist
};

// Usage
const hasPermission = await requestCameraPermission();
if (hasPermission) {
  // Open camera
}
```

### Location Permission

```typescript
import Geolocation from '@react-native-community/geolocation';

Geolocation.requestAuthorization();

Geolocation.getCurrentPosition(
  position => {
    console.log('Position:', position.coords);
  },
  error => {
    console.error('Location error:', error);
  },
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
);
```

---

## Testing

### Unit Tests (Jest)

```typescript
// src/components/ContentCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ContentCard } from './ContentCard';

describe('ContentCard', () => {
  const mockContent = {
    id: '123',
    title: 'Test Movie',
    description: 'Test description',
    thumbnail: 'https://example.com/thumb.jpg',
  };

  it('renders title and description', () => {
    const { getByText } = render(
      <ContentCard content={mockContent} onPress={jest.fn()} />
    );

    expect(getByText('Test Movie')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ContentCard content={mockContent} onPress={onPress} />
    );

    fireEvent.press(getByText('Test Movie'));

    expect(onPress).toHaveBeenCalled();
  });
});
```

### E2E Tests (Detox)

```typescript
// e2e/home.e2e.ts
describe('Home Screen', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show content list', async () => {
    await expect(element(by.id('content-list'))).toBeVisible();
  });

  it('should navigate to content detail', async () => {
    await element(by.id('content-card')).atIndex(0).tap();
    await expect(element(by.id('content-detail'))).toBeVisible();
  });

  it('should pull to refresh', async () => {
    await element(by.id('content-list')).swipe('down', 'fast', 0.8);
    await waitFor(element(by.id('loading-indicator')))
      .toBeVisible()
      .withTimeout(2000);
  });
});
```

---

## Performance Optimization

### List Performance

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={items}
  renderItem={({ item }) => <ContentCard content={item} />}
  keyExtractor={item => item.id}
  // Performance optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: 250,
    offset: 250 * index,
    index,
  })}
/>
```

### Image Optimization

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: content.thumbnail,
    priority: FastImage.priority.normal,
  }}
  style={{ width: '100%', height: 200 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

---

## Build & Release

### iOS Build

```bash
# Development build
npm run ios

# Release build
cd ios
xcodebuild -workspace BayitPlus.xcworkspace \
  -scheme BayitPlus \
  -configuration Release \
  -archivePath build/BayitPlus.xcarchive \
  archive
```

### Android Build

```bash
# Development build
npm run android

# Release build (APK)
cd android
./gradlew assembleRelease

# Release build (AAB for Play Store)
./gradlew bundleRelease
```

---

## Best Practices Summary

### DO ✅

- Use TypeScript for all files
- Use StyleSheet.create for styles
- Use SafeAreaView for safe areas
- Handle permissions properly
- Implement pull-to-refresh
- Optimize FlatList performance
- Test on both platforms
- Handle keyboard avoidance
- Use platform-specific code when needed

### DON'T ❌

- Don't use web-specific APIs
- Don't use Tailwind classes
- Don't skip safe area handling
- Don't ignore Android back button
- Don't forget permission requests
- Don't use inline styles
- Don't skip E2E tests
- Don't ignore accessibility

---

## Related Documents

- [API Overview](../api/API_OVERVIEW.md)
- [Shared Components Reference](../technical/SHARED_COMPONENTS_REFERENCE.md)
- [i18n Complete Guide](I18N_COMPLETE_GUIDE.md)
- [Testing Strategy](../testing/TESTING_STRATEGY.md)
- [tvOS Development Guide](TVOS_DEVELOPMENT_GUIDE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Mobile Team
**Next Review:** 2026-04-30
