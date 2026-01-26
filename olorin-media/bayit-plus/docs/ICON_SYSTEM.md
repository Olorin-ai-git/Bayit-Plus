# Olorin Unified Icon System

## Overview

The Olorin Unified Icon System provides a centralized, professional icon registry for all platforms in the Olorin ecosystem:

- **Web** (React with lucide-react)
- **Mobile** (React Native: iOS, Android)
- **TV** (React Native: tvOS, Android TV, Fire TV)

All platforms use the same **icon definitions** and **naming conventions**, while platform-specific utilities handle rendering differences.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  @olorin/shared-icons Package                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             Icon Registry (Core)                         │  │
│  │  - Single source of truth for all icons                  │  │
│  │  - 50+ professional lucide-react icons                   │  │
│  │  - Categories, sizes, usage documentation               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│      ┌──────────────────┼──────────────────┐                   │
│      ▼                  ▼                  ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Web       │  │   Native    │  │   Registry  │            │
│  │   Exports   │  │   Exports   │  │   Only      │            │
│  │             │  │             │  │             │            │
│  │ - Icon      │  │ - useIcon   │  │ - Types     │            │
│  │ - useIcon   │  │ - getIcon   │  │ - Utilities │            │
│  │ - renderIcon│  │ - getIcon   │  │ - Data      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

     ▼                          ▼                          ▼
  React Web              React Native           Data-Driven Apps
  Components            Mobile/TV Apps          (Backend, Dashboards)
```

## Package Structure

```
packages/ui/shared-icons/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
└── src/
    ├── index.ts                    # Main export
    ├── registry/
    │   ├── iconRegistry.ts         # Core icon registry
    │   └── index.ts
    ├── web/
    │   ├── useIcon.tsx             # React hook & component
    │   └── index.ts
    └── native/
        ├── useIcon.ts              # React Native hook
        └── index.ts
```

## Icon Categories

All 50+ icons are organized into 6 categories:

### 1. Navigation (12 icons)
For sidebar, navbar, and main navigation items.

- `home` - Home/Dashboard
- `live` - Live TV
- `vod` - Video On Demand
- `radio` - Radio
- `podcasts` - Podcasts
- `epg` - TV Guide
- `search` - Search
- `profile` - User Profile
- `settings` - Settings
- `support` - Help & Support
- `admin` - Admin Dashboard
- `discover` - Discover

### 2. Content Discovery (3 icons)
For content categories.

- `judaism` - Judaism/Spirituality
- `children` - Kids Content
- (Others TBD)

### 3. Games & Social (2 icons)
For gaming and social features.

- `games` - Games (Chess, etc.)
- `friends` - Friends/Social

### 4. Favorites & Library (5 icons)
For user library and saved content.

- `favorites` - Favorites
- `watchlist` - Watchlist/Queue
- `downloads` - Downloads
- `recordings` - My Recordings
- `widgets` - Widgets

### 5. Action Icons (15+ icons)
For user interactions and media controls.

- `play` - Play
- `pause` - Pause
- `skip` / `skipBack` - Skip controls
- `volumeUp` / `volumeDown` / `mute` - Volume
- `fullscreen` / `exitFullscreen` - Screen controls
- `add` / `remove` - Add/Remove
- `close` - Close
- `menu` / `back` / `forward` - Navigation
- `edit` / `delete` - CRUD
- `share` - Share
- `download` - Download

### 6. Status Icons (7 icons)
For indicators and alerts.

- `loading` - Loading state
- `success` - Success
- `error` - Error
- `warning` - Warning
- `info` - Information
- `check` - Checkmark
- `clock` - Time/Clock

### 7. Admin (1 icon)
For administrative features.

- `admin` - Admin Dashboard

### 8. Subscription (1 icon)
For premium/subscription features.

- `plans` - Subscription Plans

## Icon Sizes

Icons scale contextually for different platforms and use cases:

| Size | Default | Navigation | Player | TV  |
|------|---------|------------|--------|-----|
| `xs` | 12px    | 14px       | 20px   | 20px |
| `sm` | 16px    | 18px       | 24px   | 28px |
| `md` | 20px    | 22px       | 32px   | 36px |
| `lg` | 24px    | 28px       | 40px   | 48px |
| `xl` | 32px    | 36px       | 48px   | 64px |
| `xxl`| 48px    | 48px       | 64px   | 80px |

**Contexts:**
- `default` - Standard web sizes
- `navigation` - Sidebar and navbar icons (slightly larger)
- `player` - Media player controls (much larger)
- `tv` - 10-foot UI for TV remotes (extra large)

## Platform-Specific Usage

### Web (React)

```tsx
import { Icon, useIcon, renderIcon, ICON_REGISTRY } from '@olorin/shared-icons/web';

// 1. Icon Component (Recommended)
<Icon name="friends" size="lg" context="navigation" />

// 2. useIcon Hook
function Navbar() {
  const icon = useIcon({ name: 'home', size: 'md' });
  return <div>{icon}</div>;
}

// 3. renderIcon Function
const icon = renderIcon('games', 'lg', 'navigation');

// 4. Access Registry
const iconDef = ICON_REGISTRY['friends'];
console.log(iconDef.lucideName);  // "Users2"
console.log(iconDef.category);     // "navigation"
```

### Mobile/TV (React Native)

```tsx
import { useIcon, getIconData, ICON_REGISTRY } from '@olorin/shared-icons/native';

function GameMenuButton() {
  const iconData = useIcon({
    name: 'games',
    size: 'lg',
    context: 'tv',
    color: '#6D21A8'
  });

  return (
    <TouchableOpacity>
      {/* Use iconData to render with your icon library */}
      <Text>{iconData.description}</Text>
      <IconLibrary name={iconData.lucideName} size={iconData.size} />
    </TouchableOpacity>
  );
}
```

### Backend / Data-Driven Apps

```typescript
import { ICON_REGISTRY, getIconsByCategory, isValidIcon } from '@olorin/shared-icons';

// Check if icon exists
if (isValidIcon('friends')) {
  // Use icon reference
}

// Get all navigation icons
const navIcons = getIconsByCategory('navigation');

// Build API response with icon metadata
navIcons.forEach(icon => {
  console.log({
    id: icon.name,
    lucideIcon: icon.lucideName,
    category: icon.category,
    description: icon.description
  });
});
```

## Current Implementation

### GlassSidebar (Navigation)

The main sidebar now uses the unified icon system:

```tsx
// Before (emoji)
{ id: 'friends', icon: '👥', labelKey: 'nav.friends', path: '/friends' }

// After (unified system)
{ id: 'friends', icon: 'friends', labelKey: 'nav.friends', path: '/friends' }

// Rendering
<Icon name={item.icon} size="md" context="navigation" />
```

**File Updates:**
- `web/src/components/layout/GlassSidebar.tsx` ✅
- `web/src/components/layout/GlassSidebar.legacy.tsx` ✅
- `web/package.json` ✅ (added @olorin/shared-icons dependency)

## Migration Guide

### For Component Libraries

If you have a component that uses emoji icons or raw icon names:

**Step 1: Update imports**
```tsx
// Before
import * as LucideIcons from 'lucide-react';

// After
import { Icon, useIcon, ICON_REGISTRY } from '@olorin/shared-icons/web';
```

**Step 2: Update icon definitions**
```tsx
// Before
const items = [
  { id: 'play', icon: '▶️', label: 'Play' },
  { id: 'pause', icon: '⏸️', label: 'Pause' }
];

// After
const items = [
  { id: 'play', iconName: 'play', label: 'Play' },
  { id: 'pause', iconName: 'pause', label: 'Pause' }
];
```

**Step 3: Update rendering**
```tsx
// Before
{items.map(item => (
  <button key={item.id}>
    <span>{item.icon}</span>
    <span>{item.label}</span>
  </button>
))}

// After
{items.map(item => (
  <button key={item.id}>
    <Icon name={item.iconName} size="md" context="navigation" />
    <span>{item.label}</span>
  </button>
))}
```

### For Existing Components

Find all hardcoded icon references:

```bash
# Find emoji icons
grep -r "icon: '[🎮👥⭐]" src/

# Find string icon names without registry
grep -r "icon: 'Star'" src/
```

Replace with registry references:

```typescript
import { ICON_REGISTRY } from '@olorin/shared-icons/web';

// ✅ Good
<Icon name="favorites" size="lg" />

// ❌ Bad
<Icon lucideName="Star" size={24} />
```

## Adding New Icons

1. **Identify the icon** using [lucide-react docs](https://lucide.dev)
2. **Add to registry**:
   ```typescript
   // src/registry/iconRegistry.ts
   myNewIcon: {
     name: 'myNewIcon',
     lucideName: 'MyIconName',  // Exactly as in lucide-react
     category: 'action',
     description: 'My new icon',
     usage: ['context1', 'context2'],
   }
   ```

3. **Build the package**:
   ```bash
   cd packages/ui/shared-icons
   npm run build
   ```

4. **Use in components**:
   ```tsx
   <Icon name="myNewIcon" size="lg" />
   ```

5. **Update documentation** and this file

## Performance Considerations

- **Memoized hooks**: `useIcon` is memoized to prevent unnecessary re-renders
- **Registry caching**: Built once and reused across the app
- **Tree-shaking**: Only imported icons are included in the bundle
- **No runtime lookups**: All icons resolved at build/import time

## Type Safety

Full TypeScript support with exported types:

```typescript
import type {
  IconSize,           // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  IconCategory,       // 'navigation' | 'action' | 'status' | ...
  IconDefinition,     // { name, lucideName, category, ... }
  IconSizeMap,        // { xs: 12, sm: 16, ... }
} from '@olorin/shared-icons';
```

## Maintenance

### Updating Icon Sizes

If you need to adjust sizes for different platforms:

```typescript
// ICON_SIZES.tv.lg = 48 (default)
// Can be customized per application needs
```

### Removing Unused Icons

1. Search for references: `grep -r "icon: 'oldIcon'" src/`
2. Remove from registry
3. Rebuild: `npm run build`

### Deprecating Icons

Don't delete icons used elsewhere. Instead:

1. Add deprecation notice in registry
2. Add migration comments in code
3. Create PR for gradual migration

## Architecture Benefits

✅ **Single Source of Truth**: All icons defined in one place
✅ **Consistency**: Same icons across all platforms
✅ **Type Safety**: Full TypeScript support
✅ **Scalability**: Easy to add/remove/modify icons
✅ **Performance**: Memoized and tree-shaken
✅ **Documentation**: Built-in descriptions and usage examples
✅ **Maintainability**: Central registry prevents duplication
✅ **Accessibility**: Icon names and descriptions for screen readers

## Support Matrix

| Platform | Status | Export | Library |
|----------|--------|--------|---------|
| **Web** | ✅ Active | `/web` | lucide-react |
| **Mobile** | ✅ Ready | `/native` | lucide-react (future) |
| **TV** | ✅ Ready | `/native` | lucide-react (future) |
| **Backend** | ✅ Ready | `/` | N/A |

## Troubleshooting

### Icon not rendering?
- Check icon name matches registry: `ICON_REGISTRY[name]`
- Verify lucide-react version: `npm list lucide-react`
- Check console for warnings

### Wrong size?
- Verify size prop: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'`
- Check context: `'default' | 'navigation' | 'player' | 'tv'`
- Test with fixed sizes: `size={24}` vs `size="md"`

### Build errors?
- Rebuild shared-icons: `cd packages/ui/shared-icons && npm run build`
- Reinstall dependencies: `npm install`
- Check package.json for version conflicts

## Resources

- **Icon Registry**: `packages/ui/shared-icons/src/registry/iconRegistry.ts`
- **Package README**: `packages/ui/shared-icons/README.md`
- **Lucide Icons**: https://lucide.dev (50+ icons documented)
- **Design Tokens**: `packages/ui/design-tokens/` (colors, spacing)

## Next Steps

1. ✅ Core icon registry created
2. ✅ Web utilities implemented
3. ✅ Native utilities implemented
4. ✅ GlassSidebar migrated
5. 📋 Migrate remaining components
6. 📋 Add to mobile/TV apps
7. 📋 Backend integration
8. 📋 Performance monitoring

## Contributing

To propose new icons or improvements:

1. Create an issue with icon name and use case
2. Reference lucide-react icon
3. Describe usage context
4. Submit PR with registry update
