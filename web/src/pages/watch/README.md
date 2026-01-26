# Watch Page Module

Modular implementation of the Watch Page for VOD, live, radio, and podcast content playback.

## Structure

```
watch/
├── README.md                      # This file
├── WatchPage.tsx                  # Main orchestrator component (327 lines)
├── index.ts                       # Barrel exports
├── types.ts                       # Backward compatibility re-export
├── components/                    # UI Components
│   ├── index.ts                  # Component exports
│   ├── BackButton.tsx            # Back navigation button
│   ├── ContentActions.tsx        # Action buttons (add, like, share)
│   ├── ContentMetadata.tsx       # Metadata badges (year, duration, rating)
│   ├── EpisodesList.tsx          # Episodes list with play/delete
│   ├── FlowHeader.tsx            # Flow navigation header
│   ├── LoadingState.tsx          # Skeleton loading state
│   ├── NotFoundState.tsx         # Content not found state
│   ├── PlaylistPanel.tsx         # Playlist sidebar panel
│   └── ScheduleSection.tsx       # EPG schedule display
├── hooks/                         # Custom Hooks
│   ├── index.ts                  # Hook exports
│   ├── useChaptersLoader.ts      # Chapters data loading
│   ├── useContentLoader.ts       # Content and stream URL loading
│   ├── useEpisodePlayer.ts       # Episode playback management
│   └── usePlaylistManager.ts     # Flow playlist navigation
└── types/                         # TypeScript Types
    ├── index.ts                  # Type exports
    └── watch.types.ts            # All type definitions

```

## Components

### BackButton (47 lines)
Navigation button to return to previous page.

**Props:**
- `label: string` - Button text
- `onPress: () => void` - Click handler

### ContentActions (58 lines)
Action buttons for interacting with content.

**Props:**
- `addToListLabel: string` - Add to list button text
- `likeLabel: string` - Like button text
- `shareLabel: string` - Share button text

### ContentMetadata (82 lines)
Displays content metadata as badges.

**Props:**
- `year?: string` - Release year
- `duration?: string` - Content duration
- `rating?: string` - Content rating
- `genre?: string` - Content genre
- `episodeCount?: number` - Number of episodes
- `episodesLabel?: string` - Episodes label for i18n

### EpisodesList (148 lines)
Displays and manages episode list for podcasts/shows.

**Props:**
- `episodes: Episode[]` - List of episodes
- `currentEpisodeId: string | null` - Currently playing episode
- `sectionTitle: string` - Section heading
- `onPlayEpisode: (episode: Episode) => void` - Play handler
- `onDeleteEpisode: (episodeId: string) => void` - Delete handler

### FlowHeader (139 lines)
Header for flow playback with navigation controls.

**Props:**
- `flowName: string` - Name of the flow
- `playlistIndex: number` - Current position in playlist
- `playlistLength: number` - Total items in playlist
- `hasPrevItem: boolean` - Can navigate to previous
- `hasNextItem: boolean` - Can navigate to next
- `isRTL: boolean` - Right-to-left layout
- `onTogglePlaylist: () => void` - Toggle playlist panel
- `onPlayPrev: () => void` - Play previous item
- `onPlayNext: () => void` - Play next item
- `onExit: () => void` - Exit flow

### LoadingState (46 lines)
Skeleton loading state for page initialization.

### NotFoundState (54 lines)
Displays when content is not found.

**Props:**
- `notFoundLabel: string` - Error message
- `backToHomeLabel: string` - Back link text

### PlaylistPanel (147 lines)
Sidebar panel displaying flow playlist.

**Props:**
- `playlist: PlaylistItem[]` - Playlist items
- `playlistIndex: number` - Current position
- `isRTL: boolean` - Right-to-left layout
- `onClose: () => void` - Close handler
- `onSelectItem: (index: number) => void` - Item selection handler

### ScheduleSection (93 lines)
EPG schedule display for live channels.

**Props:**
- `schedule: ScheduleItem[]` - Schedule items
- `sectionTitle: string` - Section heading
- `nowLabel: string` - "Now playing" label

## Hooks

### useChaptersLoader (39 lines)
Manages chapter data loading for VOD content.

**Returns:**
- `chapters: Chapter[]` - Loaded chapters
- `chaptersLoading: boolean` - Loading state
- `loadChapters: (contentId: string) => Promise<void>` - Load function

### useContentLoader (91 lines)
Handles content data and stream URL loading for all content types.

**Parameters:**
- `contentId: string` - Content identifier
- `contentType: ContentType` - Type of content (vod/live/radio/podcast)

**Returns:**
- `content: ContentData | null` - Content data
- `streamUrl: string | null` - Stream URL
- `related: any[]` - Related content
- `loading: boolean` - Loading state
- `availableSubtitleLanguages: string[]` - Available subtitle languages

### useEpisodePlayer (50 lines)
Manages episode playback and deletion.

**Returns:**
- `currentEpisodeId: string | null` - Currently playing episode
- `handlePlayEpisode: (episode, setStreamUrl) => void` - Play handler
- `handleDeleteEpisode: (showId, episodeId, onConfirm) => Promise<void>` - Delete handler

### usePlaylistManager (96 lines)
Manages flow playlist state and navigation.

**Returns:**
- `playlist: PlaylistItem[]` - Current playlist
- `playlistIndex: number` - Current position
- `flowName: string` - Flow name
- `showPlaylistPanel: boolean` - Panel visibility
- `hasNextItem: boolean` - Can navigate forward
- `hasPrevItem: boolean` - Can navigate backward
- `isInFlow: boolean` - Is playing a flow
- `setShowPlaylistPanel: (show: boolean) => void` - Toggle panel
- `playNextItem: () => void` - Next handler
- `playPrevItem: () => void` - Previous handler
- `playItemAtIndex: (index: number) => void` - Jump to index
- `handleContentEnded: () => void` - Content end handler
- `exitFlow: () => void` - Exit flow handler

## Types

All types are defined in `types/watch.types.ts`:

- `PlaylistItem` - Flow playlist item
- `WatchPageProps` - Page component props
- `ContentData` - Content metadata
- `Episode` - Episode data
- `ScheduleItem` - EPG schedule item
- `Chapter` - Video chapter marker
- `LocationState` - React Router state
- `ContentType` - Content type union

## Usage

### Import the page
```typescript
import WatchPage from '@/pages/WatchPage';
// or
import { WatchPage } from '@/pages/watch';
```

### Import components
```typescript
import { FlowHeader, EpisodesList } from '@/pages/watch/components';
```

### Import hooks
```typescript
import { useContentLoader, usePlaylistManager } from '@/pages/watch/hooks';
```

### Import types
```typescript
import type { ContentData, Episode, PlaylistItem } from '@/pages/watch/types';
```

## Backward Compatibility

The original `/web/src/pages/WatchPage.tsx` now re-exports from this modular structure, ensuring all existing imports continue to work without changes.

## File Size Compliance

All files comply with the 200-line limit (main orchestrator allows up to 400 lines):

- WatchPage.tsx: 327 lines ✓
- All components: < 200 lines ✓
- All hooks: < 200 lines ✓
- All types: < 200 lines ✓

## Architecture

### Separation of Concerns

1. **Components** - Pure presentational UI components
2. **Hooks** - State management and business logic
3. **Types** - Shared TypeScript interfaces
4. **WatchPage** - Orchestrates components and hooks

### Data Flow

```
Router Location State
        ↓
usePlaylistManager → Playlist State
        ↓
WatchPage (determines contentId & type)
        ↓
useContentLoader → Content & Stream Data
        ↓
VideoPlayer / AudioPlayer
```

### State Management

- **Playlist State**: `usePlaylistManager` (flow navigation)
- **Content State**: `useContentLoader` (API data)
- **Chapters State**: `useChaptersLoader` (VOD chapters)
- **Episode State**: `useEpisodePlayer` (podcast episodes)
- **Local UI State**: React.useState in WatchPage

## Dependencies

### External Libraries
- react
- react-native
- react-router-dom
- react-i18next
- lucide-react

### Internal Modules
- @bayit/shared/theme
- @bayit/shared/ui
- @/services/api
- @/services/adminApi
- @/components/player
- @/components/content
- @/hooks/useDirection
- @olorin/glass-ui/hooks
- @/utils/logger

## Testing

To test the refactored module:

1. Navigate to any content URL
2. Verify content loads and plays correctly
3. Test flow navigation (if in a flow)
4. Test episode switching (for podcasts)
5. Test schedule display (for live channels)
6. Test all action buttons
7. Verify RTL layout works correctly

## Performance Optimizations

- Components use React.memo where appropriate
- Hooks use useCallback for stable function references
- Lazy loading maintained for content data
- Fire-and-forget history updates (non-blocking)

## Future Enhancements

Potential areas for further improvement:

- Add unit tests for hooks
- Add component tests with React Testing Library
- Extract shared styles to theme
- Add error boundaries
- Implement retry logic for failed API calls
- Add telemetry/analytics hooks
