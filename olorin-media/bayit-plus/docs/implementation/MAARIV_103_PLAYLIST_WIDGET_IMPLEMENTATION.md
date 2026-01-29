# Maariv 103FM Episode Archive/Playlist Widget - Implementation Summary

**Date**: 2026-01-28
**Status**: ✅ IMPLEMENTED
**Component Type**: Custom React Widget

## Overview

Successfully implemented a custom React widget that displays a scrollable archive of podcast episodes from Maariv 103FM shows (specifically "בכר וקלינבוים" - Bekhor and Klinboim). The widget fetches episodes from the existing `/podcasts/{show_id}/episodes` API endpoint and integrates with the AudioPlayer component for playback.

## Implementation Details

### 1. Frontend Component

**File**: `/web/src/components/widgets/Maariv103PlaylistWidget.tsx` (347 lines)

**Features**:
- Scrollable episode list with pagination ("Load More" functionality)
- Real-time episode playback via integrated AudioPlayer
- RTL support for Hebrew text
- Glassmorphism dark-mode styling matching Bayit+ design system
- Handles missing audio gracefully with "Audio unavailable" badges
- Loading, error, and empty states
- Manual refresh capability
- Episode counter showing "Showing X of Y"

**Key Components**:
```typescript
interface Maariv103PlaylistWidgetProps {
  podcastId?: string;      // From widget.content.podcast_id
  maxEpisodes?: number;    // Default: 20
  autoRefresh?: boolean;   // Default: false
}
```

**Episode Card UI**:
- Play/Pause icon (40x40 circular button)
- Episode title (14px bold, 2 lines max, RTL)
- Published date (11px, RTL)
- Description (11px, 1 line, RTL)
- Duration badge (glassmorphic pill) OR "Audio unavailable" badge

**Styling**:
- Container: `rgba(0, 0, 0, 0.8)` background
- Header: 103FM red `rgba(239, 68, 68, 0.9)`
- Episode cards: `rgba(0, 0, 0, 0.3)`, hover `rgba(255, 255, 255, 0.1)`
- Playing episode: Blue highlight `rgba(59, 130, 246, 0.2)` with left border
- All styling via `StyleSheet.create()` (React Native Web compatible)

### 2. Widget Container Integration

**File**: `/web/src/components/widgets/WidgetContainer.tsx`

**Changes**:
- Added import for `Maariv103PlaylistWidget`
- Updated `case 'custom'` switch statement to detect and render the new widget
- Detection logic: `component_name === 'maariv_103_playlist'` OR `(title.includes('103FM') && title.includes('ארכיון'))`

**Integration Code**:
```typescript
if (is103PlaylistWidget) {
  return (
    <Maariv103PlaylistWidget
      key={refreshKey}
      podcastId={widget.content.podcast_id || undefined}
      maxEpisodes={20}
      autoRefresh={false}
    />
  );
}
```

### 3. Type Definitions

**File**: `/web/src/types/podcast.ts`

**Added**:
```typescript
export interface EpisodesResponse {
  episodes: PodcastEpisode[]
  total: number
  page: number
  pages: number
}
```

**Existing Types** (no changes needed):
- `PodcastEpisode`: Already includes `audioUrl`, `title`, `description`, `publishedAt`, `duration`, `thumbnail`
- `WidgetContent`: Already includes `podcast_id` field

### 4. Backend Widget Configuration

**File**: `/backend/app/services/startup/defaults/maariv_103_widgets.py`

**Added Widget Config**:
```python
{
    "title": "103FM - בכר וקלינבוים - ארכיון פרקים",
    "description": "ארכיון פרקים של תוכנית בכר וקלינבוים ברדיו 103FM",
    "icon": "🎙️",
    "podcast_id": "6963c1ce8e299f975ea09bab",  # בכר וקלינבוים
    "component_name": "maariv_103_playlist",
    "order": 21,
    "position": {"x": 860, "y": 650, "width": 450, "height": 520},
}
```

**Updated TypedDict**:
```python
class Maariv103WidgetConfig(TypedDict, total=False):
    title: str
    description: str
    icon: str
    iframe_url: str       # Optional (for iframe widgets)
    podcast_id: str       # Optional (for custom widgets)
    component_name: str   # Optional (for custom widgets)
    order: int
    position: WidgetPosition
```

### 5. Backend Widget Seeder

**File**: `/backend/app/services/startup/widget_seeder.py`

**Updated Function**: `_create_maariv_103_widgets()`

**Changes**:
- Added logic to detect custom component widgets vs iframe widgets
- Creates `WidgetContent` with `content_type=CUSTOM` for playlist widget
- Sets `component_name` and `podcast_id` from config
- Maintains backward compatibility with existing iframe widgets

**Creation Logic**:
```python
is_custom = "component_name" in config and config.get("component_name")

if is_custom:
    widget_content = WidgetContent(
        content_type=WidgetContentType.CUSTOM,
        component_name=config["component_name"],
        podcast_id=config.get("podcast_id"),
    )
else:
    # iframe widget
    widget_content = WidgetContent(
        content_type=WidgetContentType.IFRAME,
        iframe_url=config["iframe_url"],
        iframe_title=config["title"],
    )
```

## Database Verification

**Widgets Created**:
```
1. 103FM - Inon Magal & Ben Kaspit
   Type: IFRAME
   URL: https://103embed.maariv.co.il/?ZrqvnVq=JGGHGF&c41t4nzVQ=FJF

2. 103FM - בכר וקלינבוים - ארכיון פרקים
   Type: CUSTOM
   Component: maariv_103_playlist
   Podcast ID: 6963c1ce8e299f975ea09bab
```

**Podcast Details**:
- **Show**: בכר וקלינבוים (Bekhor and Klinboim)
- **Author**: 103FM
- **MongoDB ID**: `6963c1ce8e299f975ea09bab`

## API Endpoint

**Existing Endpoint** (no changes needed):
```
GET /api/v1/podcasts/{podcast_id}/episodes?page={page}&limit={limit}
```

**Response Format**:
```json
{
  "episodes": [
    {
      "id": "...",
      "title": "Episode Title",
      "description": "...",
      "audioUrl": "https://..." | null,
      "duration": "45:30" | null,
      "episodeNumber": 1,
      "publishedAt": "25/01/2026",
      "thumbnail": "https://..." | null
    }
  ],
  "total": 156,
  "page": 1,
  "pages": 8
}
```

## Edge Cases Handled

1. **No Episodes**: Empty state with Music icon and "No episodes found" message
2. **API Errors**: Error state with retry button and structured error messages
3. **Missing Audio URLs**: Episodes without audio show "Audio unavailable" badge and disable play button
4. **Podcast Not Found**: Error message "Podcast not found - please check configuration"
5. **Large Episode Lists**: Pagination with "Load More" button (20 episodes per page)
6. **Malformed Data**: Graceful error handling with fallback UI

## Testing Checklist

### Backend ✅
- [x] Widget created on startup
- [x] Widget stored in MongoDB with correct fields
- [x] Widget seeder handles both iframe and custom widgets
- [x] Podcast ID correctly references existing podcast

### Frontend (To Be Tested)
- [ ] Widget appears in system widgets list
- [ ] Widget opens correctly with podcast ID
- [ ] Episodes display in scrollable list
- [ ] Dates formatted correctly (DD/MM/YYYY)
- [ ] Durations displayed in badges
- [ ] Episodes without audio show "Audio unavailable"
- [ ] Play/pause controls work correctly
- [ ] Episode highlights when playing
- [ ] AudioPlayer integrates correctly
- [ ] Pagination "Load More" works
- [ ] Counter updates correctly
- [ ] Refresh button works
- [ ] Error states display correctly
- [ ] Empty state displays correctly
- [ ] RTL layout correct for Hebrew

### Build ✅
- [x] TypeScript compilation successful
- [x] No build errors
- [x] Component imported correctly

## Files Modified

1. `/web/src/components/widgets/Maariv103PlaylistWidget.tsx` (NEW - 347 lines)
2. `/web/src/components/widgets/WidgetContainer.tsx` (MODIFIED - added import and switch case)
3. `/web/src/types/podcast.ts` (MODIFIED - added `EpisodesResponse` interface)
4. `/backend/app/services/startup/defaults/maariv_103_widgets.py` (MODIFIED - added new widget config)
5. `/backend/app/services/startup/widget_seeder.py` (MODIFIED - updated widget creation logic)

## Dependencies

**All dependencies already available**:
- `react-native` - UI components ✅
- `lucide-react` - Icons ✅
- `@olorin/design-tokens` - Design system ✅
- `@/components/player/AudioPlayer` - Audio playback ✅
- `@/stores/authStore` - Authentication ✅
- `i18next` - Internationalization ✅

**No new npm packages required** ✅

## Design Patterns Used

1. **YnetMivzakimWidget Pattern**: Followed existing custom widget implementation pattern
2. **Glassmorphism**: Consistent with Bayit+ design system
3. **RTL Support**: Hebrew text aligned right
4. **Error Handling**: Structured error messages with retry capability
5. **Pagination**: Append-style loading for better UX
6. **Configuration-Driven**: Widget config externalized to backend
7. **Type Safety**: Full TypeScript typing throughout

## Production Readiness

- ✅ No hardcoded values (podcast_id from widget config)
- ✅ No console.log statements
- ✅ Structured logging for errors
- ✅ All files under 350 lines
- ✅ Complete implementation (no TODOs, stubs, or placeholders)
- ✅ Error handling throughout
- ✅ Accessibility considerations (ARIA labels, semantic HTML)
- ✅ Cross-platform compatible (React Native Web)
- ✅ TV-compatible (inherits focus navigation from WidgetContainer)

## Next Steps

1. **Manual Testing**: Start backend and frontend, test all functionality
2. **User Testing**: Get feedback on episode list UX
3. **Performance**: Monitor API response times with large episode counts
4. **Analytics**: Track episode play rates
5. **Expansion**: Consider adding to other 103FM shows if successful

## Notes

- Episodes don't change frequently, so auto-refresh is disabled by default
- Selected podcast "בכר וקלינבוים" is a popular 103FM show with active episodes
- Widget positioned at `(860, 650)` to avoid overlap with existing widgets
- Height `520px` allows ~5-6 episodes visible without scrolling
- AudioPlayer embedded at bottom of widget (not full-screen overlay)

---

**Implementation Complete**: All code written, tested for compilation, and verified in database.
**Ready for**: Frontend runtime testing and user validation.
