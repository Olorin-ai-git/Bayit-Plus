# Glass Components Usage Guide

**Components:** GlassPageHeader, GlassSkeleton, GlassContentPlaceholder
**Version:** 1.0.0
**Last Updated:** 2026-01-24

---

## Quick Start

### Import Components

```typescript
import {
  GlassPageHeader,
  GlassSkeleton,
  ContentCardSkeleton,
  RowSkeleton,
  GridSkeleton,
  GlassContentPlaceholder,
  MoviePlaceholder,
  PodcastPlaceholder,
} from '@bayit/shared/ui';
```

---

## GlassPageHeader

### Basic Usage

```tsx
import { GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useTranslation } from 'react-i18next';

function MyPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('mypage.title')}
        pageType="podcasts"
        isRTL={isRTL}
      />
      {/* Page content */}
    </View>
  );
}
```

### With Badge Count

```tsx
<GlassPageHeader
  title={t('vod.title')}
  pageType="vod"
  badge={totalMovies + totalSeries}  // Shows count badge
  isRTL={isRTL}
/>
```

### With Custom Icon

```tsx
import { Sparkles } from 'lucide-react';

<GlassPageHeader
  title={t('live.title')}
  pageType="live"
  icon={<Sparkles size={24} color={colors.error} />}  // Custom icon
  badge={channelsCount}
  isRTL={isRTL}
/>
```

### All Supported Page Types

```typescript
type PageType =
  | 'home'        // 🏠 Purple
  | 'search'      // 🔍 Blue
  | 'live'        // 📺 Red
  | 'epg'         // 📋 Orange
  | 'vod'         // 🎬 Purple
  | 'radio'       // 📻 Teal
  | 'podcasts'    // 🎙️ Green
  | 'judaism'     // ✡️ Blue
  | 'kids'        // 👶 Pink
  | 'widgets'     // 🧩 Purple
  | 'settings'    // ⚙️ Gray
  | 'profile'     // 👤 Blue
  | 'favorites'   // ❤️ Red
  | 'watchlist'   // 📌 Orange
  | 'downloads'   // ⬇️ Green
  | 'recordings'; // ⏺️ Red
```

### Custom Styling

```tsx
<GlassPageHeader
  title="Custom Page"
  pageType="home"
  iconColor="#FF6B6B"                    // Override icon color
  iconBackgroundColor="rgba(255,107,107,0.2)"  // Override background
  style={styles.customHeader}            // Add custom styles
  titleStyle={styles.customTitle}        // Style the title
  isRTL={false}
/>

const styles = StyleSheet.create({
  customHeader: {
    marginBottom: spacing.xl,
  },
  customTitle: {
    fontSize: 28,
  },
});
```

---

## GlassSkeleton System

### Base Skeleton

```tsx
import { GlassSkeleton } from '@bayit/shared/ui';

// Simple skeleton
<GlassSkeleton width="80%" height={20} />

// Fixed width
<GlassSkeleton width={200} height={16} />

// Full width
<GlassSkeleton width="100%" height={48} />

// Disable animation
<GlassSkeleton width="60%" height={20} animate={false} />

// Custom border radius
<GlassSkeleton width={100} height={100} borderRadius={50} />
```

### Content Card Skeleton

```tsx
import { ContentCardSkeleton } from '@bayit/shared/ui';

// Default
<ContentCardSkeleton />

// With custom styling
<ContentCardSkeleton style={{ width: 200 }} />

// In a grid
<View style={styles.grid}>
  {Array.from({ length: 12 }).map((_, i) => (
    <ContentCardSkeleton key={i} />
  ))}
</View>
```

### Row Skeleton (Carousel)

```tsx
import { RowSkeleton } from '@bayit/shared/ui';

// Default (5 cards)
<RowSkeleton />

// Custom number of cards
<RowSkeleton numCards={8} />

// Multiple rows
<>
  <RowSkeleton numCards={5} />
  <RowSkeleton numCards={5} />
  <RowSkeleton numCards={5} />
</>
```

### Grid Skeleton

```tsx
import { GridSkeleton } from '@bayit/shared/ui';

// Default (4 columns, 3 rows)
<GridSkeleton />

// Custom grid
<GridSkeleton numColumns={6} numRows={2} />

// Responsive columns
const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 2;
<GridSkeleton numColumns={numColumns} numRows={3} />
```

### Hero Carousel Skeleton

```tsx
import { HeroCarouselSkeleton } from '@bayit/shared/ui';

// Default (600px height)
<HeroCarouselSkeleton />

// Custom height
<HeroCarouselSkeleton height={500} />

// For TV (larger)
<HeroCarouselSkeleton height={IS_TV_BUILD ? 700 : 600} />
```

### Page Header Skeleton

```tsx
import { PageHeaderSkeleton } from '@bayit/shared/ui';

<PageHeaderSkeleton />
```

### List Item Skeleton

```tsx
import { ListItemSkeleton } from '@bayit/shared/ui';

// Single item
<ListItemSkeleton />

// List of items
{Array.from({ length: 10 }).map((_, i) => (
  <ListItemSkeleton key={i} />
))}
```

### Complete Loading Page Example

```tsx
function MyPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header skeleton */}
        <PageHeaderSkeleton />

        {/* Search/filter skeleton */}
        <View style={styles.searchSkeleton} />

        {/* Content skeletons */}
        <GridSkeleton numColumns={4} numRows={2} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('page.title')}
        pageType="vod"
        badge={data.length}
        isRTL={isRTL}
      />
      {/* Actual content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  searchSkeleton: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
});
```

---

## GlassContentPlaceholder

### Pre-configured Placeholders

```tsx
import {
  MoviePlaceholder,
  SeriesPlaceholder,
  PodcastPlaceholder,
  RadioPlaceholder,
  LiveChannelPlaceholder,
} from '@bayit/shared/ui';

// Movie placeholder (2:3 aspect ratio)
<MoviePlaceholder size="medium" />

// Series placeholder (2:3 aspect ratio)
<SeriesPlaceholder size="small" />

// Podcast placeholder (1:1 aspect ratio)
<PodcastPlaceholder size="large" />

// Radio station placeholder (1:1 aspect ratio)
<RadioPlaceholder size="medium" />

// Live channel placeholder (16:9 aspect ratio)
<LiveChannelPlaceholder size="medium" />
```

### Generic Placeholder

```tsx
import { GlassContentPlaceholder } from '@bayit/shared/ui';

<GlassContentPlaceholder
  type="movie"              // Content type
  aspectRatio="2:3"         // Aspect ratio
  size="medium"             // Size variant
  label="Movie"             // Optional label
/>
```

### Content Type Options

```typescript
type ContentPlaceholderType =
  | 'movie'     // 🎬 Film icon, purple
  | 'series'    // 📺 TV icon, teal
  | 'episode'   // ▶️ PlayCircle icon, blue
  | 'podcast'   // 🎙️ Podcast icon, green
  | 'radio'     // 📻 Radio icon, orange
  | 'live'      // ✨ Sparkles icon, red
  | 'music'     // 🎵 Music icon, pink
  | 'generic';  // 🎬 Film icon, gray
```

### Aspect Ratio Options

```typescript
aspectRatio: '1:1' | '16:9' | '2:3' | '3:4'
```

### Size Variants

```typescript
size: 'small' | 'medium' | 'large'
// small = 0.6x, medium = 1x, large = 1.4x
```

### Custom Icon and Label

```tsx
import { Film } from 'lucide-react';

<GlassContentPlaceholder
  type="generic"
  aspectRatio="16:9"
  size="medium"
  icon={<Film size={64} color="#10B981" />}  // Custom icon
  label="Custom Content"                      // Custom label
/>
```

### Conditional Rendering (Image or Placeholder)

```tsx
// In a content card component
function ContentCard({ item }) {
  return (
    <View style={styles.card}>
      {item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <MoviePlaceholder size="medium" />
      )}
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );
}
```

### In a Show/Podcast Card

```tsx
function ShowCard({ show }) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.coverContainer}>
        {show.cover ? (
          <Image
            source={{ uri: show.cover }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <PodcastPlaceholder size="medium" />
        )}
      </View>
      <Text style={styles.title}>{show.title}</Text>
    </GlassCard>
  );
}
```

### In a Radio Station Card

```tsx
function StationCard({ station }) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.logoContainer}>
        {station.logo ? (
          <Image
            source={{ uri: station.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <RadioPlaceholder size="medium" />
        )}
      </View>
      <Text style={styles.name}>{station.name}</Text>
    </GlassCard>
  );
}
```

---

## Complete Page Example

### Full Implementation

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Film } from 'lucide-react';
import {
  GlassPageHeader,
  GridSkeleton,
  GlassCard,
  MoviePlaceholder,
} from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { contentService } from '@/services/api';

interface Movie {
  id: string;
  title: string;
  thumbnail?: string;
}

function MovieCard({ movie }: { movie: Movie }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <GlassCard
      style={[styles.card, isHovered && styles.cardHovered]}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <View style={styles.thumbnailContainer}>
        {movie.thumbnail ? (
          <Image
            source={{ uri: movie.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <MoviePlaceholder size="medium" />
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>
    </GlassCard>
  );
}

export default function MoviesPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const data = await contentService.getAllMovies();
      setMovies(data.items || []);
    } catch (error) {
      console.error('Failed to load movies', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state with skeletons
  if (loading) {
    return (
      <View style={styles.container}>
        <GlassPageHeader
          title={t('movies.title')}
          pageType="vod"
          isRTL={isRTL}
        />
        <View style={styles.searchSkeleton} />
        <GridSkeleton numColumns={5} numRows={2} />
      </View>
    );
  }

  // Loaded state
  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t('movies.title')}
        pageType="vod"
        badge={movies.length}
        isRTL={isRTL}
      />

      <FlatList
        data={movies}
        keyExtractor={(item) => item.id}
        numColumns={5}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => <MovieCard movie={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Film size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('movies.noMovies')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  searchSkeleton: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  grid: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    margin: spacing.xs,
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
  },
  thumbnailContainer: {
    aspectRatio: 2 / 3,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
```

---

## Best Practices

### 1. Always Show Loading Skeletons

```tsx
// ✅ CORRECT
if (loading) {
  return <GridSkeleton numColumns={4} numRows={2} />;
}

// ❌ WRONG
if (loading) {
  return <Text>Loading...</Text>;
}
```

### 2. Use Type-Specific Placeholders

```tsx
// ✅ CORRECT
{item.thumbnail ? (
  <Image source={{ uri: item.thumbnail }} />
) : (
  <PodcastPlaceholder size="medium" />
)}

// ❌ WRONG
{item.thumbnail ? (
  <Image source={{ uri: item.thumbnail }} />
) : (
  <View style={styles.placeholder}>
    <Text>No Image</Text>
  </View>
)}
```

### 3. Match Skeleton to Final Layout

```tsx
// ✅ CORRECT - Skeleton matches final grid
if (loading) {
  return <GridSkeleton numColumns={numColumns} numRows={2} />;
}

return (
  <FlatList
    data={items}
    numColumns={numColumns}  // Same as skeleton
    {...props}
  />
);
```

### 4. Always Include Badge Counts

```tsx
// ✅ CORRECT
<GlassPageHeader
  title="Podcasts"
  pageType="podcasts"
  badge={shows.length}  // Shows count
/>

// ⚠️ ACCEPTABLE (no badge if no data)
<GlassPageHeader
  title="Podcasts"
  pageType="podcasts"
  badge={shows.length > 0 ? shows.length : undefined}
/>
```

### 5. Respect RTL Layout

```tsx
// ✅ CORRECT
const { isRTL } = useDirection();

<GlassPageHeader
  title={t('page.title')}
  pageType="home"
  isRTL={isRTL}  // Always pass RTL state
/>
```

---

## Performance Tips

### 1. Reuse Skeleton Components

```tsx
// ✅ CORRECT - Single skeleton for multiple sections
const ContentSkeleton = () => (
  <>
    <PageHeaderSkeleton />
    <View style={styles.searchSkeleton} />
    <GridSkeleton numColumns={4} numRows={2} />
  </>
);

// Use everywhere
if (loading) return <ContentSkeleton />;
```

### 2. Optimize Placeholder Rendering

```tsx
// ✅ CORRECT - Placeholder only when needed
const renderThumbnail = useCallback((thumbnail: string | undefined) => {
  if (thumbnail) {
    return <Image source={{ uri: thumbnail }} style={styles.thumbnail} />;
  }
  return <MoviePlaceholder size="medium" />;
}, []);
```

### 3. Lazy Load Images

```tsx
// ✅ CORRECT - Show placeholder until image loads
const [imageLoaded, setImageLoaded] = useState(false);

<View>
  {!imageLoaded && <MoviePlaceholder size="medium" />}
  <Image
    source={{ uri: item.thumbnail }}
    style={[styles.thumbnail, !imageLoaded && styles.hidden]}
    onLoad={() => setImageLoaded(true)}
  />
</View>
```

---

## Troubleshooting

### Issue: Skeletons Not Animating

**Solution:** Ensure `animate` prop is not set to `false`

```tsx
// Check
<GlassSkeleton animate={true} />  // or omit (defaults to true)
```

### Issue: Placeholder Icons Too Small/Large

**Solution:** Use `iconSize` prop

```tsx
<GlassContentPlaceholder
  type="movie"
  iconSize={64}  // Custom icon size
/>
```

### Issue: Badge Not Showing

**Solution:** Ensure badge value is defined and non-zero

```tsx
<GlassPageHeader
  badge={items.length || undefined}  // Hide if 0
/>
```

### Issue: RTL Layout Broken

**Solution:** Always pass `isRTL` prop

```tsx
const { isRTL } = useDirection();

<GlassPageHeader isRTL={isRTL} />
```

---

## Migration Guide

### From Custom Headers to GlassPageHeader

```tsx
// BEFORE
<View style={styles.header}>
  <View style={styles.iconContainer}>
    <Podcast size={24} color={colors.success} />
  </View>
  <Text style={styles.title}>{t('podcasts.title')}</Text>
</View>

// AFTER
<GlassPageHeader
  title={t('podcasts.title')}
  pageType="podcasts"
  badge={shows.length}
  isRTL={isRTL}
/>
```

### From Loading Spinners to Skeletons

```tsx
// BEFORE
{loading && <ActivityIndicator size="large" />}

// AFTER
{loading && <GridSkeleton numColumns={4} numRows={2} />}
```

### From Dark Circles to Placeholders

```tsx
// BEFORE
{!item.thumbnail && (
  <View style={styles.placeholder}>
    <Icon size={32} color={colors.muted} />
  </View>
)}

// AFTER
{!item.thumbnail && <PodcastPlaceholder size="medium" />}
```

---

## FAQ

**Q: Can I customize the skeleton animation speed?**
A: Not directly, but you can disable animation with `animate={false}` if needed.

**Q: How do I add a new page type to GlassPageHeader?**
A: Edit `GlassPageHeader.tsx` and add to `DEFAULT_PAGE_ICONS` and `DEFAULT_ICON_COLORS`.

**Q: Can I use custom colors for placeholders?**
A: Not directly through props. Create a custom placeholder component if needed.

**Q: Do skeletons work on all platforms?**
A: Yes! They're built with React Native and work on Web, iOS, and tvOS.

**Q: Should I always show badge counts?**
A: Only when data is available. Use `badge={count || undefined}` to hide when zero.

---

## Additional Resources

- **Component Files:**
  - `/shared/components/ui/GlassPageHeader.tsx`
  - `/shared/components/ui/GlassSkeleton.tsx`
  - `/shared/components/ui/GlassContentPlaceholder.tsx`

- **Documentation:**
  - `/docs/implementation/MISSING_ASSETS_IMPLEMENTATION.md`
  - `/docs/implementation/MISSING_ASSETS_SUMMARY.md`

- **Examples:**
  - `/web/src/pages/PodcastsPage.tsx`
  - `/web/src/pages/VODPage.tsx`
  - `/web/src/pages/RadioPage.tsx`
