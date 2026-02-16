# Avatar Movie Studio - Flagship Admin Feature

**Date:** 2026-02-15
**Status:** 🎬 Planning Phase
**Priority:** FLAGSHIP FEATURE

## Vision

A dedicated admin portal for creating, managing, and curating AI-powered avatar interactions across Bayit+'s entire VOD library. This is the command center for transforming passive viewing into interactive experiences.

## Page Location

**URL:** `/admin/avatar-movie-studio`
**Navigation:** Content Library section (prominent placement)
**Access:** Admin-only

## Core Features

### 1. Content Library View (Main Dashboard)

**Grid/List View** of all VOD content with:
- Movie poster thumbnail
- Title + year
- Current status badge:
  - 🎬 "Ready" (has interactive moments)
  - ⏳ "In Progress" (partially configured)
  - ➕ "Not Started" (no moments)
  - 🔴 "Needs Review" (errors/issues)
- Quick stats:
  - Number of interactive moments
  - Total engagement time
  - User interaction count (analytics)

**Filters:**
- Status (Ready/In Progress/Not Started)
- Genre/Category
- Has Creatify avatar / Needs avatar creation
- Recently edited
- Most popular with users

**Search:** Real-time search by title, character name, or interaction prompt

**Bulk Actions:**
- Export moments to JSON
- Import moments from template
- Duplicate moments from similar content
- Batch character assignment

### 2. Studio Editor (Per-Movie Workspace)

Click any movie → Opens full-screen studio editor with:

#### Left Panel: Video Preview & Timeline
- Full video player with controls
- Interactive timeline with moment markers
- Scrubbing with frame-by-frame precision
- Keyboard shortcuts (Space=pause, J/K/L=rewind/pause/forward)
- Current timestamp display (MM:SS.mmm)

#### Right Panel: Moment Management
- List of all moments for this movie (sortable by timestamp)
- Add Moment button (marks current video position)
- Each moment card shows:
  - Timestamp
  - Character thumbnail (extracted frame)
  - Character name
  - Interaction prompt preview
  - Edit/Delete actions
  - Drag-to-reorder

#### Bottom Panel: Moment Editor (when moment selected)
- **Timestamp:** Fine-tune with +/- 0.1s buttons
- **Character Frame:**
  - Current frame preview
  - "Extract Frame" button (pulls from current video position)
  - Upload custom image option
  - Creatify avatar preview (if created)
- **Character Name:** Text input with autocomplete from previous characters
- **Interaction Prompt:**
  - Rich text editor
  - Suggested prompts based on character/scene
  - Preview how it appears to users
- **Metadata:**
  - Voice ID selection (ElevenLabs voices)
  - Conversation context/personality
  - Max interaction duration (30s/60s/120s)
  - Auto-generate reel (yes/no)

### 3. Character Library

**Dedicated tab** for managing characters across all content:

- List of all extracted characters (deduplicated by name)
- Character cards showing:
  - Reference image
  - Character name
  - Appears in X movies
  - Total interactions across platform
  - Assigned voice
  - Creatify avatar ID (if created)

**Character Actions:**
- Create Creatify avatar from reference image
- Assign voice globally (apply to all moments with this character)
- Edit character metadata
- Merge duplicate characters
- Export/Import character library

### 4. Templates & Presets

**Common Scenarios:**
- Biblical moments (Moshe, Pharaoh, Aaron)
- Historical figures
- Character types (protagonist, antagonist, mentor)

**Template Features:**
- Save moment configurations as templates
- Quick-apply template to new content
- Community templates (curated by admins)
- Export/Import template library

### 5. Analytics Dashboard (Tab)

**Engagement Metrics:**
- Most interacted moments (by content)
- Average conversation length
- Skip rate per moment
- Reel generation rate
- Popular characters

**Content Performance:**
- Movies with highest interaction engagement
- Time of day patterns
- User retention during interactions
- A/B test results (different prompts)

### 6. Bulk Operations & Automation

**AI-Assisted Moment Suggestions:**
- Analyze subtitles/captions to suggest interaction points
- Detect scene changes for potential moments
- Face detection to auto-extract character frames

**Batch Processing:**
- Create moments for multiple movies simultaneously
- Apply character voices across all content
- Generate Creatify avatars in queue

## Technical Architecture

### New Components

```
/web/src/pages/admin/AvatarMovieStudio/
├── index.tsx                    # Main page with navigation tabs
├── ContentLibraryView.tsx       # Grid/list of all content
├── StudioEditor.tsx             # Full-screen editor for single movie
├── CharacterLibrary.tsx         # Character management tab
├── TemplatesPanel.tsx           # Templates & presets tab
├── AnalyticsDashboard.tsx       # Engagement metrics tab
└── components/
    ├── MomentCard.tsx           # Individual moment in list
    ├── MomentEditor.tsx         # Bottom panel for editing moment
    ├── VideoTimeline.tsx        # Custom timeline with markers
    ├── CharacterCard.tsx        # Character in library
    └── BulkActionsBar.tsx       # Toolbar for bulk operations
```

### State Management

**Zustand Store:** `src/stores/avatarStudioStore.ts`

```typescript
interface AvatarStudioStore {
  // Content library
  movies: Movie[]
  selectedMovie: Movie | null
  filters: FilterState

  // Studio editor
  moments: InteractiveMoment[]
  selectedMoment: InteractiveMoment | null
  videoTime: number

  // Character library
  characters: Character[]

  // Templates
  templates: MomentTemplate[]

  // Actions
  loadMovies: () => Promise<void>
  selectMovie: (movieId: string) => void
  addMoment: (timestamp: number) => void
  updateMoment: (momentId: string, data: Partial<InteractiveMoment>) => void
  deleteMoment: (momentId: string) => void
  saveMoments: () => Promise<void>

  // Bulk operations
  importMoments: (file: File) => Promise<void>
  exportMoments: (movieIds: string[]) => void
  duplicateMoments: (fromMovieId: string, toMovieId: string) => void
}
```

### API Endpoints

**New routes in** `/backend/app/api/routes/avatar_studio.py`:

```python
GET    /admin/avatar-studio/movies              # List all VOD content
GET    /admin/avatar-studio/movies/:id/moments  # Get moments for movie
POST   /admin/avatar-studio/movies/:id/moments  # Create moment
PATCH  /admin/avatar-studio/moments/:id         # Update moment
DELETE /admin/avatar-studio/moments/:id         # Delete moment
POST   /admin/avatar-studio/moments/bulk        # Bulk create/update

GET    /admin/avatar-studio/characters          # List all characters
POST   /admin/avatar-studio/characters          # Create character
PATCH  /admin/avatar-studio/characters/:id      # Update character
DELETE /admin/avatar-studio/characters/:id      # Delete character

GET    /admin/avatar-studio/templates           # List templates
POST   /admin/avatar-studio/templates           # Create template
POST   /admin/avatar-studio/templates/:id/apply # Apply template to movie

GET    /admin/avatar-studio/analytics           # Get engagement metrics
POST   /admin/avatar-studio/suggest-moments     # AI-assisted suggestions
```

## Navigation Integration

**Update** `/web/src/components/admin/AdminNav.tsx`:

```typescript
{
  icon: <Film />,
  label: t('nav.content'),
  children: [
    { path: '/admin/content-library', label: t('nav.contentLibrary') },
    {
      path: '/admin/avatar-movie-studio',
      label: '🎬 Avatar Movie Studio',  // Prominent visual indicator
      badge: 'FLAGSHIP'
    },
    { path: '/admin/featured', label: t('nav.featured') },
    // ... other items
  ]
}
```

## User Experience Flow

### First-Time Setup
1. Admin navigates to Avatar Movie Studio
2. Sees grid of all VOD content
3. Content without moments shows "Get Started" badge
4. Click movie → Opens studio editor
5. Watch video, mark first moment at key scene
6. Extract character frame, name character
7. Write engaging interaction prompt
8. Save moment → Movie now shows "1 moment" in library

### Power User Workflow
1. Filter to "Not Started" movies
2. Select multiple movies
3. Apply "Biblical Characters" template
4. Bulk-create Creatify avatars for all characters
5. Review suggested moments from AI analysis
6. Fine-tune prompts
7. Export moment library for backup

## Design System

**All components use @bayit/glass:**
- GlassCard for movie thumbnails
- GlassButton for actions
- GlassModal for confirmations
- GlassInput for text fields
- GlassTable for character library
- Custom GlassTimeline component (new)

**Color Coding:**
- 🟢 Green: Ready/Active
- 🟡 Yellow: In Progress
- 🔴 Red: Needs Attention
- ⚪ Gray: Not Started

## Platform Support

### Web ✅
- Full functionality
- Keyboard shortcuts
- Drag-and-drop reordering
- Real-time collaboration (future)

### Mobile 📱
- View-only mode
- "Edit on Web" button
- Analytics dashboard available

### tvOS 📺
- Not available (admin feature)

## Internationalization

**New translation namespace:** `admin:avatarStudio`

```json
{
  "avatarStudio": {
    "title": "Avatar Movie Studio",
    "contentLibrary": "Content Library",
    "studioEditor": "Studio Editor",
    "characterLibrary": "Character Library",
    "templates": "Templates & Presets",
    "analytics": "Analytics",
    "status": {
      "ready": "Ready",
      "inProgress": "In Progress",
      "notStarted": "Not Started",
      "needsReview": "Needs Review"
    },
    "actions": {
      "addMoment": "Add Moment",
      "extractFrame": "Extract Frame",
      "createAvatar": "Create Creatify Avatar",
      "saveMoments": "Save All Moments",
      "exportMoments": "Export Moments",
      "importMoments": "Import Moments"
    }
    // ... many more keys
  }
}
```

## Success Metrics

**Internal (Admin Experience):**
- Time to mark first moment: < 2 minutes
- Average moments per movie: 3-5
- Character library size: 50+ unique characters
- Template usage: 30%+ of moments use templates

**User-Facing (Engagement):**
- Interaction rate: 40%+ of eligible moments triggered
- Average conversation length: 45+ seconds
- Reel generation rate: 25%+
- Repeat interaction rate: 15%+

## Implementation Phases

### Phase 1: Core Studio (Week 1)
- [ ] Create page structure and navigation
- [ ] Content library grid view
- [ ] Basic studio editor (video + timeline)
- [ ] Add/edit/delete moments
- [ ] Save to backend

### Phase 2: Character Management (Week 2)
- [ ] Character library tab
- [ ] Character deduplication
- [ ] Voice assignment
- [ ] Creatify avatar creation

### Phase 3: Templates & Automation (Week 3)
- [ ] Template system
- [ ] Bulk operations
- [ ] AI-assisted suggestions
- [ ] Import/Export functionality

### Phase 4: Analytics & Polish (Week 4)
- [ ] Analytics dashboard
- [ ] Performance metrics
- [ ] Keyboard shortcuts
- [ ] User testing and refinement

## Open Questions

1. **Permissions:** Do we need role-based access (curator vs admin)?
2. **Real-time collaboration:** Multiple admins editing simultaneously?
3. **Version history:** Undo/redo for moments? Moment history log?
4. **Preview mode:** Test interactions before publishing?
5. **Mobile curation:** Any mobile-optimized workflow for field work?

## Next Steps

1. **Review this plan** with product team
2. **Design mockups** for key screens (library, editor, character library)
3. **Prioritize features** (MVP vs nice-to-have)
4. **Estimate timeline** and resource requirements
5. **Create detailed implementation tasks**

---

**This is THE flagship feature that makes Bayit+ unique.** Let's build something extraordinary.
