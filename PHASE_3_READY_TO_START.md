# Phase 3: Web Frontend Discovery Page - READY TO START

**Status**: ✅ All foundation layers complete - Phase 3 can begin immediately

**Date**: 2026-01-26
**Dependencies Satisfied**: All
**Blocking Issues**: None

---

## Phase 3 Overview

Implement user-facing audiobooks discovery and detail pages matching existing podcast architecture.

### Scope

| Component | File | Lines | Pattern |
|-----------|------|-------|---------|
| **Discovery Page** | `AudiobooksPage.tsx` | 95 | Podcast page pattern |
| **Header** | `AudiobooksPageHeader.tsx` | 60 | Search + filters header |
| **Filters** | `AudiobooksPageFilters.tsx` | 80 | Filter panel |
| **Grid** | `AudiobooksPageGrid.tsx` | 75 | Responsive grid + pagination |
| **Card** | `AudiobookCard.tsx` | 85 | Card component |
| **Detail** | `AudiobookDetailPage.tsx` | 120 | Full metadata view |

**Total**: ~515 lines across 6 files, all under 200-line limit

---

## Dependencies - All Satisfied ✅

### Phase 1: Types ✅ COMPLETE
```
✅ /web/src/types/audiobook.ts
✅ /web/src/types/audiobook.types.ts
✅ /web/src/types/audiobook.schemas.ts
✅ /web/src/types/audiobook.filters.ts
✅ /web/src/types/audiobook.utils.ts
✅ Shared types in /shared/services/api/types.ts
```

**What you'll use in Phase 3**:
- Import types from `/web/src/types/audiobook`
- Type all props: `Audiobook`, `AudiobookListResponse`, `AudiobookFilters`
- Use Zod schemas for response validation if needed

### Phase 2: Services ✅ COMPLETE
```
✅ /web/src/services/audiobookService.ts
✅ /web/src/services/adminAudiobookService.ts
✅ Full test coverage (45+ tests)
```

**What you'll use in Phase 3**:
```typescript
import audiobookService from '../services/audiobookService'

// In discovery page:
const data = await audiobookService.getAudiobooks({ page: 1, page_size: 50 })
const featured = await audiobookService.getFeaturedAudiobooks()
const search = await audiobookService.searchAudiobooks(query)

// In detail page:
const detail = await audiobookService.getAudiobookDetail(id)
```

### Backend API ✅ COMPLETE
```
✅ Endpoints: /api/v1/audiobooks (list, search, featured)
✅ Endpoints: /api/v1/audiobooks/{id} (detail, stream)
✅ Security: SSRF and injection prevention
✅ Testing: 23+ integration tests passing
```

### Design System ✅ AVAILABLE
```
✅ @bayit/glass components (GlassCard, GlassButton, GlassInput, GlassModal)
✅ TailwindCSS dark mode and RTL support
✅ Glassmorphism effects built-in
✅ Responsive breakpoints defined
```

### Navigation ✅ READY
```
✅ React Router v6+ available
✅ Podcast page pattern available as reference
✅ Existing routing setup for /audiobooks and /audiobooks/{id}
```

---

## Implementation Guide

### 1. Discovery Page (`AudiobooksPage.tsx`)

**Purpose**: Main entry point for audiobooks discovery

**Structure**:
```typescript
export function AudiobooksPage() {
  // State
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AudiobookFilters>({})
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch on mount and filter change
  useEffect(() => {
    fetchAudiobooks()
  }, [page, filters])

  // Render
  return (
    <div className="flex flex-col gap-4">
      <AudiobooksPageHeader onSearch={handleSearch} />
      <AudiobooksPageFilters filters={filters} onChange={setFilters} />
      <AudiobooksPageGrid
        audiobooks={audiobooks}
        loading={loading}
        error={error}
        page={page}
        onPageChange={setPage}
      />
    </div>
  )
}
```

**Key Points**:
- Use `useState` for pagination, filters, loading/error
- Use `useEffect` to call `audiobookService.getAudiobooks()`
- Pass filtered state down to child components
- Handle loading and error states

### 2. Header Component (`AudiobooksPageHeader.tsx`)

**Purpose**: Search input and page title

**Features**:
- Page title: "Audiobooks"
- Search input with suggestions (typeahead)
- Last sync time display
- Responsive design

**Implementation**:
```typescript
export function AudiobooksPageHeader({ onSearch }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AudiobookSearchSuggestion[]>([])

  // Fetch suggestions as user types
  const handleSearchChange = async (value: string) => {
    setQuery(value)
    if (value.length >= 2) {
      const sugg = await audiobookService.getSearchSuggestions(value)
      setSuggestions(sugg)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold text-white">Audiobooks</h1>
      <GlassInput
        placeholder="Search audiobooks..."
        value={query}
        onChangeText={handleSearchChange}
      />
      {suggestions.length > 0 && (
        <div className="bg-black/20 rounded-lg p-2">
          {suggestions.map(s => (
            <div key={s.id}>{s.title}</div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 3. Filters Component (`AudiobooksPageFilters.tsx`)

**Purpose**: Filter sidebar/bottom sheet with options

**Filters to Support**:
- Category/Genre (dropdown)
- Publisher (searchable dropdown)
- Audio Quality (dropdown: 8-bit, 16-bit, 24-bit, 32-bit, high-fidelity)
- Subscription Tier (dropdown: free, basic, premium, family)
- Sort (dropdown: title, newest, views, rating)
- Sort Order (radio: ascending, descending)

**Implementation**:
```typescript
export function AudiobooksPageFilters({ filters, onChange }) {
  return (
    <div className="bg-black/20 rounded-lg p-4 flex flex-col gap-4">
      <GlassSelect
        label="Genre"
        value={filters.genre_ids?.[0] || ''}
        onChangeText={(val) => onChange({ ...filters, genre_ids: [val] })}
        options={genres}
      />
      <GlassSelect
        label="Audio Quality"
        value={filters.audio_quality || ''}
        onChangeText={(val) => onChange({ ...filters, audio_quality: val })}
        options={['8-bit', '16-bit', '24-bit', '32-bit', 'high-fidelity']}
      />
      {/* More filters... */}
      <div className="flex gap-2">
        <GlassButton onPress={() => onChange({})}>Clear</GlassButton>
        <GlassButton onPress={() => {}}>Apply</GlassButton>
      </div>
    </div>
  )
}
```

### 4. Grid Component (`AudiobooksPageGrid.tsx`)

**Purpose**: Responsive grid with pagination

**Responsive Layout**:
- Desktop: 3 columns (lg+ screens)
- Tablet: 2 columns (md screens)
- Mobile: 1 column (sm screens)

**Features**:
- Loading skeleton states
- Empty state message
- Pagination (next/prev buttons)
- Page indicator

**Implementation**:
```typescript
export function AudiobooksPageGrid({ audiobooks, loading, page, onPageChange }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array(6).fill(0).map((_, i) => <GlassSkeleton key={i} />)
          : audiobooks.map((book) => (
              <AudiobookCard key={book.id} audiobook={book} />
            ))}
      </div>

      {audiobooks.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          No audiobooks found. Try adjusting filters.
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <GlassButton
          disabled={page === 1}
          onPress={() => onPageChange(page - 1)}
        >
          Previous
        </GlassButton>
        <span className="text-white">Page {page}</span>
        <GlassButton
          onPress={() => onPageChange(page + 1)}
        >
          Next
        </GlassButton>
      </div>
    </div>
  )
}
```

### 5. Card Component (`AudiobookCard.tsx`)

**Purpose**: Individual audiobook card

**Features**:
- Thumbnail image
- Title (bold)
- Author name
- Narrator
- Duration
- Rating stars (if available)
- View count badge
- Hover effect (scale)
- Click to navigate to detail

**Implementation**:
```typescript
export function AudiobookCard({ audiobook }: { audiobook: Audiobook }) {
  const navigate = useNavigate()

  return (
    <GlassCard
      className="cursor-pointer hover:scale-105 transition-transform"
      onPress={() => navigate(`/audiobooks/${audiobook.id}`)}
    >
      <img
        src={audiobook.thumbnail}
        alt={audiobook.title}
        className="w-full h-40 object-cover rounded-lg"
      />
      <div className="p-3">
        <h3 className="font-bold text-white text-lg">{audiobook.title}</h3>
        <p className="text-sm text-gray-300">{audiobook.author}</p>
        <p className="text-xs text-gray-400">{audiobook.narrator}</p>
        <div className="flex justify-between mt-2 text-xs">
          <span>{audiobook.duration}</span>
          <span>👁 {audiobook.view_count}</span>
        </div>
        {audiobook.rating && (
          <div className="text-yellow-400">⭐ {audiobook.rating.toFixed(1)}</div>
        )}
      </div>
    </GlassCard>
  )
}
```

### 6. Detail Page (`AudiobookDetailPage.tsx`)

**Purpose**: Full audiobook details view

**Layout**:
- Sidebar (desktop) / Stacked (mobile)
- Large thumbnail on left
- Metadata on right

**Content**:
- Title, author, narrator (prominent)
- Description (expandable if long)
- Specs: duration, format, ISBN, publisher
- Rating display + user rating input
- Add to favorites button
- Share button
- Related audiobooks carousel
- Reviews section (paginated)
- Admin stream URL button (if admin)

**Implementation**:
```typescript
export function AudiobookDetailPage({ id }: { id: string }) {
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    audiobookService.getAudiobookDetail(id).then(setAudiobook).finally(() => setLoading(false))
  }, [id])

  if (loading) return <GlassSpinner />
  if (!audiobook) return <div>Not found</div>

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-1/3">
        <img
          src={audiobook.backdrop || audiobook.thumbnail}
          alt={audiobook.title}
          className="w-full rounded-lg"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">{audiobook.title}</h1>
          <p className="text-xl text-gray-300">{audiobook.author}</p>
          <p className="text-gray-400">Narrator: {audiobook.narrator}</p>
        </div>

        <p className="text-gray-300">{audiobook.description}</p>

        {/* Specs */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-400">Duration:</span> {audiobook.duration}</div>
          <div><span className="text-gray-400">Quality:</span> {audiobook.audio_quality}</div>
          <div><span className="text-gray-400">ISBN:</span> {audiobook.isbn}</div>
          <div><span className="text-gray-400">Publisher:</span> {audiobook.publisher_name}</div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <GlassButton className="flex-1">Add to Library</GlassButton>
          <GlassButton variant="secondary">Share</GlassButton>
        </div>

        {/* Rating */}
        <div className="bg-black/20 rounded-lg p-4">
          <p className="text-gray-300">Average Rating: ⭐ {audiobook.avg_rating.toFixed(1)}</p>
          <p className="text-gray-300">Your Rating: ⭐⭐⭐⭐☆</p>
        </div>
      </div>
    </div>
  )
}
```

---

## Service Integration Examples

### Get List with Filters
```typescript
const response = await audiobookService.getAudiobooks({
  page: 1,
  page_size: 50,
  author: 'Stephen King',
  audio_quality: '24-bit',
  requires_subscription: 'free',
  sort_by: 'newest',
  sort_order: 'desc'
})
```

### Search
```typescript
const results = await audiobookService.searchAudiobooks('mystery thriller', 10)
// Returns: { results, total, query }
```

### Get Detail
```typescript
const audiobook = await audiobookService.getAudiobookDetail('audiobook-id-123')
// Returns fully-typed Audiobook object
```

### Get Featured
```typescript
const featured = await audiobookService.getFeaturedAudiobooks(10)
// Returns array of featured audiobooks
```

---

## Design System Usage

### Glass Components to Use

**For Discovery Page**:
```typescript
<GlassCard>      {/* Container with glassmorphism */}
<GlassButton>    {/* Primary action button */}
<GlassInput>     {/* Search input with glass effect */}
<GlassSelect>    {/* Filter dropdown */}
<GlassSpinner>   {/* Loading state */}
<GlassSkeleton>  {/* Skeleton loading */}
<GlassModal>     {/* Filter modal on mobile */}
<GlassBadge>     {/* View count, tags */}
```

### Styling with TailwindCSS

**Dark Mode** (default):
```typescript
className="bg-black/20 backdrop-blur-xl rounded-lg text-white dark:text-white"
```

**Responsive**:
```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
// Mobile: 1 col, Tablet (768px+): 2 cols, Desktop (1024px+): 3 cols
```

**RTL Support** (Hebrew):
```typescript
className="flex rtl:flex-row-reverse gap-4"
// Component automatically handles RTL layout
```

---

## Navigation Setup

### Add Routes (if not already present)

In main router configuration:
```typescript
{
  path: 'audiobooks',
  element: <AudiobooksPage />
},
{
  path: 'audiobooks/:id',
  element: <AudiobookDetailPage />
}
```

### Navigation from Components

```typescript
// In AudiobookCard.tsx
const navigate = useNavigate()
navigate(`/audiobooks/${audiobook.id}`)

// Back button in detail page
const navigate = useNavigate()
navigate(-1)  // or navigate('/audiobooks')
```

---

## Error Handling Strategy

### HTTP Errors
```typescript
try {
  const data = await audiobookService.getAudiobooks()
} catch (error) {
  if (error.response?.status === 404) {
    setError('Audiobooks not found')
  } else if (error.response?.status === 401) {
    // User not authenticated - handled by api.js
  } else {
    setError('Failed to load audiobooks')
  }
}
```

### Empty States
```typescript
if (audiobooks.length === 0 && !loading) {
  return <div>No audiobooks found. Try adjusting filters.</div>
}
```

### Loading States
```typescript
if (loading) return <GlassSpinner />
```

---

## Localization Readiness

All UI strings should be i18n-ready (not hardcoded):

```typescript
// Instead of: <h1>Audiobooks</h1>
import { useTranslation } from '@olorin/shared-i18n'

export function AudiobooksPageHeader() {
  const { t } = useTranslation()
  return <h1>{t('audiobooks:page.title')}</h1>
}
```

**Will be handled in Phase 7**. For Phase 3, use temporary strings or placeholder i18n keys.

---

## Checklist for Phase 3

### Planning
- [ ] Review podcast page implementation as reference
- [ ] Finalize filter options and layout
- [ ] Plan responsive breakpoints
- [ ] Design glassmorphism color scheme

### Implementation
- [ ] Create AudiobooksPage.tsx (95 lines)
- [ ] Create AudiobooksPageHeader.tsx (60 lines)
- [ ] Create AudiobooksPageFilters.tsx (80 lines)
- [ ] Create AudiobooksPageGrid.tsx (75 lines)
- [ ] Create AudiobookCard.tsx (85 lines)
- [ ] Create AudiobookDetailPage.tsx (120 lines)

### Styling
- [ ] Apply GlassCard styling
- [ ] Apply TailwindCSS responsive layout
- [ ] Implement dark mode
- [ ] Verify RTL layout (Hebrew)

### Features
- [ ] Pagination (next/prev)
- [ ] Filtering (author, narrator, quality, subscription, sort)
- [ ] Search with suggestions
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states

### Testing
- [ ] Unit tests for all components
- [ ] Integration tests with services
- [ ] E2E tests for user flows
- [ ] Responsive design testing
- [ ] RTL layout testing

### Documentation
- [ ] JSDoc comments on all components
- [ ] TypeScript types for all props
- [ ] README for component usage

---

## Files to Reference

**Existing Implementation Patterns**:
- Podcast page: `/web/src/pages/PodcastsPage.tsx` (if available)
- Podcast card: `/web/src/components/PodcastCard.tsx` (if available)
- Trivia service: `/web/src/services/triviaApi.ts` (service pattern)
- API client: `/web/src/services/api.js` (HTTP setup)

**New Audiobook Files**:
- Types: `/web/src/types/audiobook.ts`
- Services: `/web/src/services/audiobookService.ts`
- Services: `/web/src/services/adminAudiobookService.ts`

---

## Time Estimate

Single Developer: **2-3 days**
- Day 1: Discovery page + filters + grid
- Day 2: Detail page + related content
- Day 3: Testing + refinements

Team: **1 day** (2-3 developers)

---

## Critical Success Factors

1. **Follow Glass Component Pattern** - All UI uses @bayit/glass
2. **Type Safety** - All props and state fully typed
3. **Error Handling** - Graceful handling of API errors
4. **Responsive Design** - Works on all screen sizes
5. **Performance** - Pagination prevents loading large lists
6. **Accessibility** - Semantic HTML, ARIA labels, keyboard nav

---

## Go Forward Decision

✅ **All dependencies satisfied**
✅ **All blockers resolved**
✅ **Ready to implement Phase 3**

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Status**: READY TO START
