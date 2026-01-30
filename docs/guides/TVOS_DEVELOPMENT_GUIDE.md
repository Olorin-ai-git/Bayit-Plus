# tvOS Development Guide

**Stack:** React Native for TV + TypeScript + StyleSheet + Focus Navigation
**Last Updated:** 2026-01-30

## Overview

This guide covers tvOS development patterns and best practices for the Bayit+ Apple TV application. tvOS requires special consideration for 10-foot UI design, focus-based navigation, and Siri Remote input handling.

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.73+ | Cross-platform framework |
| **React Native for TV** | Built-in | TV-specific APIs |
| **TypeScript** | 5.0+ | Type safety |
| **StyleSheet** | Built-in | Styling |
| **React Navigation** | 6.x | Screen navigation |
| **AsyncStorage** | Built-in | Persistent storage |
| **i18next** | 25.8+ | Internationalization |

---

## Project Structure

```
tvos-app/
├── src/
│   ├── components/          # React Native components
│   │   ├── common/          # Shared components
│   │   ├── features/        # Feature-specific components
│   │   └── navigation/      # Navigation components
│   ├── screens/             # Screen components
│   ├── services/            # API services
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   ├── config/              # Configuration
│   └── styles/              # Shared styles and theme
├── ios/                     # iOS/tvOS native code
│   ├── BayitPlusTV.xcodeproj
│   └── BayitPlusTV/
├── package.json
├── tsconfig.json
└── metro.config.js          # Metro bundler configuration
```

---

## Getting Started

### Prerequisites

```bash
# Check versions
node --version  # Should be 18+
npm --version   # Should be 8+
xcodebuild -version  # Should be Xcode 15+

# tvOS Simulator
# Install via Xcode > Settings > Platforms > tvOS
```

### Installation

```bash
cd tvos-app
npm install
cd ios
pod install
cd ..
```

### Development Server

```bash
npm start
# Metro bundler starts on port 8081

# In another terminal, run:
npm run ios
# Opens tvOS Simulator with the app
```

### Build for Production

```bash
npm run build:tvos
# Output: ios/build/Release-appletvos/
```

---

## 10-Foot UI Design Principles

tvOS apps are viewed from 10 feet away on large screens. Follow these principles:

### Typography

```typescript
const styles = StyleSheet.create({
  // ❌ TOO SMALL - Unreadable from 10 feet
  tinyText: {
    fontSize: 12,
  },

  // ✅ MINIMUM - 29pt for body text
  bodyText: {
    fontSize: 29,
    color: '#fff',
  },

  // ✅ OPTIMAL - 38pt for headings
  heading: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ✅ LARGE - 48pt for titles
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
});
```

**Guidelines:**
- **Minimum body text**: 29pt
- **Headings**: 38pt - 48pt
- **Titles**: 48pt - 76pt
- **Line height**: 1.3x - 1.5x font size

### Spacing and Layout

```typescript
const styles = StyleSheet.create({
  container: {
    padding: 60,  // ✅ Comfortable padding
  },

  grid: {
    gap: 40,  // ✅ Visible spacing between items
  },

  // ❌ TOO TIGHT - Hard to navigate
  tightGrid: {
    gap: 10,
  },
});
```

**Guidelines:**
- **Minimum padding**: 60px
- **Grid gaps**: 40px - 80px
- **Touch targets**: 250x150px minimum
- **Safe zones**: 90px from screen edges

### Focus Affordances

```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
  },

  buttonFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1.05 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
});
```

**Guidelines:**
- **Scale**: 1.05x - 1.1x when focused
- **Shadow**: White glow for depth
- **Border**: 3px - 5px border on focus
- **Animation**: 200ms - 300ms transition

---

## Focus Navigation

### Making Components Focusable

```typescript
import { Pressable, View, Text, StyleSheet } from 'react-native';

interface FocusableButtonProps {
  title: string;
  onPress: () => void;
}

export const FocusableButton: React.FC<FocusableButtonProps> = ({ title, onPress }) => {
  return (
    <Pressable
      focusable={true}  // ✅ CRITICAL - Makes component focusable
      onPress={onPress}
      style={({ focused }) => [
        styles.button,
        focused && styles.buttonFocused,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 250,
    minHeight: 80,
  },
  buttonFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1.05 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  buttonText: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
```

### Focus Order

```typescript
import { View, Pressable, Text, StyleSheet } from 'react-native';

// Focus order: left to right, top to bottom (natural reading order)
export const NavigationBar = () => {
  return (
    <View style={styles.navbar}>
      <Pressable focusable={true} style={styles.navItem}>
        <Text>Home</Text>
      </Pressable>
      <Pressable focusable={true} style={styles.navItem}>
        <Text>Movies</Text>
      </Pressable>
      <Pressable focusable={true} style={styles.navItem}>
        <Text>Series</Text>
      </Pressable>
      <Pressable focusable={true} style={styles.navItem}>
        <Text>Live TV</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',  // Horizontal focus order
    gap: 40,
    paddingHorizontal: 60,
    paddingVertical: 30,
  },
  navItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
```

### TVFocusGuideView

Use `TVFocusGuideView` to control focus navigation:

```typescript
import { View, Pressable, Text, TVFocusGuideView } from 'react-native';
import { useRef } from 'react';

export const CustomFocusLayout = () => {
  const targetRef = useRef(null);

  return (
    <View>
      {/* Focus guide directs focus to targetRef when coming from above */}
      <TVFocusGuideView
        autoFocus={false}
        destinations={[targetRef.current]}
      >
        <View style={{ height: 200 }}>
          {/* Empty area that redirects focus */}
        </View>
      </TVFocusGuideView>

      <Pressable
        ref={targetRef}
        focusable={true}
        style={styles.target}
      >
        <Text>Target Button</Text>
      </Pressable>
    </View>
  );
};
```

### Preventing Focus Traps

```typescript
// ❌ BAD - Focus can get stuck
<ScrollView>
  <Pressable focusable={true}>
    <View>
      <Pressable focusable={true}>
        {/* Nested focusable elements cause confusion */}
      </Pressable>
    </View>
  </Pressable>
</ScrollView>

// ✅ GOOD - Clear focus hierarchy
<ScrollView>
  <View>
    <Pressable focusable={true}>
      <Text>Clear focusable target</Text>
    </Pressable>
  </View>
  <View>
    <Pressable focusable={true}>
      <Text>Another clear target</Text>
    </Pressable>
  </View>
</ScrollView>
```

---

## Siri Remote Handling

### Remote Gestures

```typescript
import { useTVEventHandler } from 'react-native';

export const useRemoteControl = (onPress: (event: string) => void) => {
  useTVEventHandler((evt) => {
    if (evt.eventType === 'select') {
      onPress('select');
    } else if (evt.eventType === 'playPause') {
      onPress('playPause');
    } else if (evt.eventType === 'menu') {
      onPress('menu');
    } else if (evt.eventType === 'swipeUp') {
      onPress('swipeUp');
    } else if (evt.eventType === 'swipeDown') {
      onPress('swipeDown');
    } else if (evt.eventType === 'swipeLeft') {
      onPress('swipeLeft');
    } else if (evt.eventType === 'swipeRight') {
      onPress('swipeRight');
    }
  });
};

// Usage
export const VideoPlayer = () => {
  useRemoteControl((event) => {
    switch (event) {
      case 'playPause':
        togglePlayPause();
        break;
      case 'swipeRight':
        skipForward();
        break;
      case 'swipeLeft':
        skipBackward();
        break;
      case 'menu':
        exitPlayer();
        break;
    }
  });

  return <View>{/* Video player UI */}</View>;
};
```

### Siri Remote Events

| Event | Description | Common Use |
|-------|-------------|------------|
| `select` | Trackpad click | Activate button, select item |
| `playPause` | Play/Pause button | Toggle playback |
| `menu` | Menu button | Go back, show menu |
| `swipeUp` | Swipe up | Scroll up, show info |
| `swipeDown` | Swipe down | Scroll down, hide info |
| `swipeLeft` | Swipe left | Previous, rewind |
| `swipeRight` | Swipe right | Next, fast forward |
| `longPress` | Press and hold | Context menu, options |

---

## Component Patterns

### Content Card (10-Foot UI)

```typescript
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/glass';

interface ContentCardProps {
  id: string;
  title: string;
  thumbnail: string;
  onPress: (id: string) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  id,
  title,
  thumbnail,
  onPress,
}) => {
  return (
    <Pressable
      focusable={true}
      onPress={() => onPress(id)}
      style={({ focused }) => [
        styles.card,
        focused && styles.cardFocused,
      ]}
    >
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardFocused: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  thumbnail: {
    width: '100%',
    height: 225,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#fff',
    padding: 20,
  },
});
```

### Horizontal Scroll (FlatList)

```typescript
import { FlatList, View, StyleSheet } from 'react-native';

interface ContentRowProps {
  items: Content[];
  onItemPress: (id: string) => void;
}

export const ContentRow: React.FC<ContentRowProps> = ({ items, onItemPress }) => {
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ContentCard
          id={item.id}
          title={item.title}
          thumbnail={item.thumbnail}
          onPress={onItemPress}
        />
      )}
      contentContainerStyle={styles.list}
      showsHorizontalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 60,
    paddingVertical: 20,
  },
  separator: {
    width: 40,  // Spacing between cards
  },
});
```

### Loading State

```typescript
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    fontSize: 38,
    color: '#fff',
    marginTop: 20,
  },
});
```

---

## Navigation

### Stack Navigator Setup

```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from './screens/HomeScreen';
import { ContentScreen } from './screens/ContentScreen';
import { PlayerScreen } from './screens/PlayerScreen';

export type RootStackParamList = {
  Home: undefined;
  Content: { id: string };
  Player: { contentId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Content" component={ContentScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### Navigation Between Screens

```typescript
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleContentPress = (id: string) => {
    navigation.navigate('Content', { id });
  };

  return (
    <View>
      <ContentCard id="123" title="Movie" onPress={handleContentPress} />
    </View>
  );
};
```

---

## Styling Best Practices

### Using StyleSheet

```typescript
import { View, Text, StyleSheet } from 'react-native';

// ✅ CORRECT - StyleSheet for React Native
const Component = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Title</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
});
```

### Dynamic Styles

```typescript
// Conditional styling based on props
interface CardProps {
  focused: boolean;
  selected: boolean;
}

const getCardStyle = ({ focused, selected }: CardProps) => [
  styles.card,
  focused && styles.cardFocused,
  selected && styles.cardSelected,
];

// Usage
<View style={getCardStyle({ focused: true, selected: false })} />
```

### Responsive Sizing

```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,  // 90% of screen width
    height: height * 0.7,  // 70% of screen height
  },
});
```

---

## Performance Optimization

### FlatList Optimization

```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance optimizations
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: 250,  // Item height
    offset: 250 * index,
    index,
  })}
/>
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize component
export const ContentCard = memo(({ id, title, thumbnail, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <Pressable onPress={handlePress}>
      {/* Card content */}
    </Pressable>
  );
});

// Memoize computed values
const filteredItems = useMemo(() => {
  return items.filter(item => item.section === 'movies');
}, [items]);
```

### Image Optimization

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: thumbnail }}
  style={styles.thumbnail}
  resizeMode={FastImage.resizeMode.cover}
  priority={FastImage.priority.high}
/>
```

---

## Testing

### Component Testing

```typescript
// ContentCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ContentCard } from './ContentCard';

describe('ContentCard', () => {
  const mockProps = {
    id: '123',
    title: 'Test Movie',
    thumbnail: 'https://example.com/image.jpg',
    onPress: jest.fn(),
  };

  it('renders title', () => {
    const { getByText } = render(<ContentCard {...mockProps} />);
    expect(getByText('Test Movie')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(<ContentCard {...mockProps} />);
    fireEvent.press(getByText('Test Movie'));
    expect(mockProps.onPress).toHaveBeenCalledWith('123');
  });

  it('renders thumbnail', () => {
    const { getByRole } = render(<ContentCard {...mockProps} />);
    const image = getByRole('image');
    expect(image.props.source.uri).toBe(mockProps.thumbnail);
  });
});
```

### Focus Testing

```typescript
import { render } from '@testing-library/react-native';
import { FocusableButton } from './FocusableButton';

describe('FocusableButton', () => {
  it('is focusable', () => {
    const { getByRole } = render(
      <FocusableButton title="Test" onPress={jest.fn()} />
    );

    const button = getByRole('button');
    expect(button.props.focusable).toBe(true);
  });

  it('applies focused style when focused', () => {
    const { getByRole } = render(
      <FocusableButton title="Test" onPress={jest.fn()} />
    );

    const button = getByRole('button');
    // Simulate focus
    button.props.style({ focused: true });
    // Verify focused styles applied
  });
});
```

### Manual Testing on tvOS Simulator

```bash
# Run tests
npm test

# Launch tvOS Simulator
npm run ios

# Test checklist:
# - Navigate with arrow keys (up/down/left/right)
# - Press Enter to activate buttons
# - Press ESC for menu/back
# - Test all screens and flows
# - Verify focus indicators are visible
# - Check text readability from distance
# - Verify no focus traps exist
```

---

## Build and Deployment

### Development Build

```bash
# Clean build
cd ios
xcodebuild clean -workspace BayitPlusTV.xcworkspace -scheme BayitPlusTV
cd ..

# Build
npm run ios
```

### Production Build

```bash
# Build for release
cd ios
xcodebuild archive \
  -workspace BayitPlusTV.xcworkspace \
  -scheme BayitPlusTV \
  -configuration Release \
  -archivePath ./build/BayitPlusTV.xcarchive

# Export for App Store
xcodebuild -exportArchive \
  -archivePath ./build/BayitPlusTV.xcarchive \
  -exportPath ./build/Release \
  -exportOptionsPlist exportOptions.plist
```

### App Store Submission

1. **Prepare Assets**:
   - App Icon: 1280x768px
   - Top Shelf Image: 1920x720px
   - Screenshots: 1920x1080px (3-5 screenshots)

2. **TestFlight**:
   ```bash
   # Upload to TestFlight
   xcrun altool --upload-app \
     --type tvos \
     --file ./build/Release/BayitPlusTV.ipa \
     --username "your@email.com" \
     --password "app-specific-password"
   ```

3. **App Store Connect**:
   - Complete app metadata
   - Add privacy policy
   - Submit for review

---

## Environment Variables

```bash
# .env
REACT_APP_API_BASE_URL=https://api.bayitplus.com
REACT_APP_WS_BASE_URL=wss://ws.bayitplus.com
REACT_APP_ENV=production
```

**Usage:**
```typescript
import Config from 'react-native-config';

const apiUrl = Config.REACT_APP_API_BASE_URL;
```

---

## Best Practices Summary

### DO ✅

- Use StyleSheet for all styling
- Implement 10-foot UI principles
- Make all interactive elements focusable
- Use scale transforms for focus states
- Test on real tvOS Simulator
- Handle Siri Remote gestures
- Implement proper focus indicators
- Use large typography (29pt minimum)
- Provide adequate spacing (40px+ gaps)
- Test navigation from all directions

### DON'T ❌

- Don't use TailwindCSS (not supported)
- Don't use small fonts (<29pt)
- Don't create focus traps
- Don't use complex gestures
- Don't skip focus testing
- Don't ignore safe zones
- Don't use tight spacing
- Don't nest focusable elements
- Don't hardcode API URLs
- Don't skip accessibility

---

## Common Issues

### Issue: Focus Not Working

**Solution:**
```typescript
// Ensure focusable={true} is set
<Pressable focusable={true} onPress={handlePress}>
  <Text>Button</Text>
</Pressable>

// Check parent Views are not blocking focus
<View pointerEvents="box-none">
  <Pressable focusable={true}>
    {/* Content */}
  </Pressable>
</View>
```

### Issue: Text Too Small

**Solution:**
```typescript
// ❌ BAD - Unreadable
const styles = StyleSheet.create({
  text: { fontSize: 16 }
});

// ✅ GOOD - Readable from 10 feet
const styles = StyleSheet.create({
  text: { fontSize: 29 }
});
```

### Issue: Focus Indicator Not Visible

**Solution:**
```typescript
const styles = StyleSheet.create({
  buttonFocused: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
```

---

## Related Documents

- [Mobile Development Guide](MOBILE_DEVELOPMENT_GUIDE.md)
- [Shared Components Reference](../technical/SHARED_COMPONENTS_REFERENCE.md)
- [i18n Complete Guide](I18N_COMPLETE_GUIDE.md)
- [Testing Strategy](../testing/TESTING_STRATEGY.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** tvOS Team
**Next Review:** 2026-04-30
