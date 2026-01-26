# @olorin/shared-icons

Unified icon system for the entire Olorin ecosystem. Provides a centralized registry of professional lucide-react icons with platform-specific utilities for Web, Mobile, and TV platforms.

## Features

- **Unified Icon Registry**: Single source of truth for all icons across the ecosystem
- **Platform-Specific Exports**: Optimized utilities for web, mobile, and TV
- **Type-Safe**: Full TypeScript support with icon definitions
- **Scalable**: Easy to add new icons and maintain consistency
- **Performance**: Memoized hooks and optimized rendering
- **Documented**: Built-in descriptions and usage examples for each icon

## Installation

```bash
npm install @olorin/shared-icons
```

## Usage

### Web (React)

```tsx
import { Icon, useIcon, ICON_REGISTRY } from '@olorin/shared-icons/web';

// Using Icon component
<Icon name="home" size="md" context="navigation" />

// Using useIcon hook
function MyComponent() {
  const homeIcon = useIcon({ name: 'home', size: 'lg' });
  return <div>{homeIcon}</div>;
}

// Using renderIcon function
import { renderIcon } from '@olorin/shared-icons/web';
const icon = renderIcon('games', 'lg', 'navigation');

// Access registry
console.log(ICON_REGISTRY.home);
console.log(ICON_REGISTRY.friends);
```

### Mobile / TV (React Native)

```tsx
import { useIcon, ICON_REGISTRY } from '@olorin/shared-icons/native';

function MyComponent() {
  const iconData = useIcon({
    name: 'friends',
    size: 'lg',
    context: 'tv',
    color: '#6D21A8'
  });

  return (
    <View>
      {/* iconData contains lucideName, size, color, etc. */}
      <Text>{iconData.description}</Text>
    </View>
  );
}
```

### Registry Only

```tsx
import {
  ICON_REGISTRY,
  getIcon,
  getIconSize,
  getIconsByCategory,
  isValidIcon
} from '@olorin/shared-icons';

// Get a specific icon
const icon = getIcon('home');
console.log(icon.lucideName); // "Home"
console.log(icon.category);   // "navigation"

// Get icons by category
const navIcons = getIconsByCategory('navigation');

// Get size for context
const size = getIconSize('lg', 'tv'); // 64

// Check if icon exists
if (isValidIcon('home')) {
  // Use icon
}
```

## Icon Categories

Icons are organized by category:

- **navigation**: Main navigation items (home, settings, profile, etc.)
- **action**: User actions (play, pause, add, delete, etc.)
- **status**: Status indicators (loading, success, error, warning, etc.)
- **media**: Media controls (play, pause, volume, etc.)
- **ui**: UI elements (dropdowns, buttons, etc.)
- **admin**: Admin-specific icons (admin dashboard, etc.)

## Icon Sizes

Sizes are contextual and platform-specific:

- `xs`: Extra small (12-20px depending on context)
- `sm`: Small (16-28px)
- `md`: Medium (20-36px)
- `lg`: Large (24-48px)
- `xl`: Extra large (32-64px)
- `xxl`: Extra extra large (48-80px)

### Size Contexts

- `default`: Standard web sizes
- `navigation`: Slightly larger for nav items
- `player`: Large sizes for media players
- `tv`: Extra large for TV remote navigation

## Complete Icon List

### Navigation

- `home` (Home)
- `live` (Live TV)
- `vod` (Film)
- `radio` (Radio)
- `podcasts` (Mic)
- `epg` (Calendar)
- `search` (Search)
- `profile` (User)
- `settings` (Settings)
- `support` (Help Circle)
- `admin` (Shield Alert)

### Content Discovery

- `discover` (Compass)
- `judaism` (Book Open)
- `children` (Users)

### Games & Social

- `games` (Gamepad2)
- `friends` (Users2)

### Favorites & Library

- `favorites` (Star)
- `watchlist` (List Video)
- `downloads` (Download)
- `recordings` (Disc3)
- `widgets` (Grid)

### Subscription

- `plans` (Crown)

### Actions

- `play` (Play)
- `pause` (Pause)
- `skip` (Skip Forward)
- `skipBack` (Skip Back)
- `volumeUp` (Volume2)
- `volumeDown` (Volume1)
- `mute` (VolumeX)
- `fullscreen` (Maximize)
- `exitFullscreen` (Minimize)
- `add` (Plus)
- `remove` (Minus)
- `close` (X)
- `menu` (Menu)
- `back` (Arrow Left)
- `forward` (Arrow Right)
- `edit` (Edit2)
- `delete` (Trash2)
- `share` (Share2)
- `download` (Download)

### Status

- `loading` (Loader)
- `success` (Check Circle)
- `error` (Alert Circle)
- `warning` (Alert Triangle)
- `info` (Info)
- `check` (Check)
- `clock` (Clock)

### UI Elements

- `dropdown` (Chevron Down)
- `expand` (Chevron Down)
- `collapse` (Chevron Up)
- `more` (More Vertical)

## Migration Guide

### From Emoji Icons

**Before:**
```tsx
const menuSections = [
  {
    items: [
      { id: 'home', icon: '🏠', labelKey: 'nav.home', path: '/' },
      { id: 'games', icon: '🎮', labelKey: 'nav.games', path: '/games' },
      { id: 'friends', icon: '👥', labelKey: 'nav.friends', path: '/friends' },
    ],
  },
];
```

**After:**
```tsx
import { Icon } from '@olorin/shared-icons/web';

const menuSections = [
  {
    items: [
      { id: 'home', iconName: 'home', labelKey: 'nav.home', path: '/' },
      { id: 'games', iconName: 'games', labelKey: 'nav.games', path: '/games' },
      { id: 'friends', iconName: 'friends', labelKey: 'nav.friends', path: '/friends' },
    ],
  },
];

// In component:
{section.items.map((item) => (
  <Icon key={item.id} name={item.iconName} size="md" context="navigation" />
))}
```

## Adding New Icons

1. Add the icon definition to `ICON_REGISTRY` in `src/registry/iconRegistry.ts`
2. Use the lucide-react icon name
3. Include category, description, and usage examples
4. Build the package: `npm run build`
5. Update this README

Example:
```typescript
downloads: {
  name: 'downloads',
  lucideName: 'Download',
  category: 'navigation',
  description: 'Downloads',
  usage: ['navbar', 'sidebar', 'library'],
},
```

## Customizing Sizes

To modify icon sizes for your platform:

```typescript
import { ICON_SIZES, IconSize } from '@olorin/shared-icons';

// ICON_SIZES.tv.lg = 48 (default)
// Change for your needs if necessary
```

## Type Definitions

```typescript
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type IconCategory = 'navigation' | 'action' | 'status' | 'media' | 'ui' | 'admin';

export interface IconDefinition {
  name: string;
  lucideName: string;
  category: IconCategory;
  description: string;
  usage?: string[];
}

export interface IconSizeMap {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}
```

## Best Practices

1. **Always use the registry**: Import icons from the registry, never hardcode lucide names
2. **Use appropriate sizes**: Choose sizes based on context (navigation, player, etc.)
3. **Maintain consistency**: Don't create new variations of existing icons
4. **Document usage**: Add icons to the registry with clear descriptions
5. **Test all platforms**: Verify icons look correct on web, mobile, and TV

## Performance

- Icons are memoized to prevent unnecessary re-renders
- Size calculations are cached
- Registry is built once and reused across the app
- Tree-shakeable exports for minimal bundle size

## Platform Support

- **Web**: React 18+ with lucide-react
- **Mobile**: React Native 0.76+ (iOS, Android)
- **TV**: React Native 0.76+ (tvOS, Android TV, Fire TV)

## Contributing

To contribute new icons or improvements:

1. Create a new branch
2. Update `src/registry/iconRegistry.ts`
3. Update this README
4. Submit a pull request

## License

UNLICENSED - Internal Olorin Project
