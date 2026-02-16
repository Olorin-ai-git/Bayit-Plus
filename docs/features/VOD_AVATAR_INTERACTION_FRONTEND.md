# VOD Avatar Interaction - Frontend Implementation

**Status:** ✅ Implemented
**Date:** 2026-02-15

## Overview

Frontend components for enabling Zeh Ani avatars to interact with movie characters during VOD playback. Transforms passive viewing into active engagement with AI-generated character responses.

## Architecture

### Component Hierarchy

```
VODInteractionPlayer (Main Wrapper)
├── Video Player (HTML5 video element)
├── InteractiveMomentPrompt (Auto-pause prompt)
└── InteractionOverlay (Live interaction UI)
    ├── Avatar Display
    ├── Character Video Player
    └── Conversation Interface
```

### State Management

**Hook:** `useVODInteraction`

Manages:
- Interactive moment detection based on video currentTime
- Session lifecycle (start, active, complete)
- Message sending and response handling
- Automatic video pause/resume

## Components

### 1. VODInteractionPlayer

**File:** `/web/src/components/vod-interactions/VODInteractionPlayer.tsx`

Main wrapper component that adds interaction capabilities to any video player.

**Props:**
```typescript
{
  contentId: string;          // Content ID to fetch interactive moments
  profileId: string;          // User's profile ID
  avatarId: string;           // User's avatar ID
  videoUrl: string;           // Video source URL
  avatarComponent?: ReactNode; // Optional avatar 3D component
  onInteractionComplete?: (sessionId: string) => void;
  className?: string;
}
```

**Usage:**
```tsx
import { VODInteractionPlayer } from '@/components/vod-interactions';

<VODInteractionPlayer
  contentId="exodus-ep1"
  profileId={currentProfile.id}
  avatarId={currentAvatar.id}
  videoUrl="https://cdn.bayit.tv/content/exodus-ep1.mp4"
  onInteractionComplete={(sessionId) => {
    console.log('Interaction complete:', sessionId);
  }}
/>
```

### 2. InteractiveMomentPrompt

**File:** `/web/src/components/vod-interactions/InteractiveMomentPrompt.tsx`

Displays when video auto-pauses at an interactive moment.

**Props:**
```typescript
{
  moment: InteractiveMoment;  // Current interactive moment
  onStart: () => void;        // Start interaction callback
  onSkip: () => void;         // Skip and resume video
}
```

**Features:**
- Character frame preview
- Character name and interaction prompt
- Start/Skip buttons
- Interaction window duration display

### 3. InteractionOverlay

**File:** `/web/src/components/vod-interactions/InteractionOverlay.tsx`

Live interaction UI with conversation and character responses.

**Props:**
```typescript
{
  session: InteractionSession;
  onSendMessage: (message: string) => Promise<any>;
  onComplete: () => void;
  isSending: boolean;
  avatarComponent?: ReactNode;
}
```

**Layout:**
- **Left Side:** User avatar + animated character video
- **Right Side:** Conversation history + message input

**Features:**
- Real-time message history
- Character animated video playback
- Message input with Enter key support
- End interaction button

### 4. useVODInteraction Hook

**File:** `/web/src/hooks/useVODInteraction.ts`

**State:**
```typescript
{
  currentMoment: InteractiveMoment | null;
  activeSession: InteractionSession | null;
  isInteracting: boolean;
  isSending: boolean;
}
```

**Methods:**
```typescript
{
  startInteraction: () => Promise<void>;
  sendMessage: (text: string) => Promise<CharacterResponse>;
  completeInteraction: () => Promise<void>;
  skipInteraction: () => void;
  generateReel: (sessionIds: string[]) => Promise<Reel>;
}
```

## Admin Components

### InteractiveMomentEditor

**File:** `/web/src/components/admin/InteractiveMomentEditor.tsx`

Admin tool for curating interactive moments in content.

**Props:**
```typescript
{
  contentId: string;    // Content to edit
  videoUrl: string;     // Video source for preview
  onClose: () => void;  // Close modal callback
}
```

**Features:**
- Video preview with timeline
- Mark timestamps for interactions
- Extract character frames at timestamp
- Set character metadata:
  - Character name
  - Scene context
  - Interaction prompt
  - Duration
- Save all moments to content

**Integration:**
Add to existing admin content editor:
```tsx
import { InteractiveMomentEditor } from '@/components/admin/InteractiveMomentEditor';

{showInteractionEditor && (
  <InteractiveMomentEditor
    contentId={content.id}
    videoUrl={content.video_url}
    onClose={() => setShowInteractionEditor(false)}
  />
)}
```

## API Integration

All API calls use the centralized `/web/src/services/api.js` service.

### User Endpoints

```typescript
// Load interactive moments
GET /content/:contentId
Response: { interactive_moments: InteractiveMoment[], ... }

// Start session
POST /vod-interactions/sessions/start
Body: {
  content_id, profile_id, avatar_id,
  moment_timestamp, character_name,
  scene_context, character_frame_url
}
Response: InteractionSession

// Send message
POST /vod-interactions/sessions/:id/message
Body: { message_text: string }
Response: {
  dialogue_exchanges: DialogueExchange[],
  character_response: {
    audio_url, animated_video_url, duration
  }
}

// Complete session
POST /vod-interactions/sessions/:id/complete
Response: { credits_charged: number }

// Generate reel
POST /vod-interactions/reels/generate
Body: { content_id, profile_id, session_ids: string[] }
Response: { reel_id, video_url, share_token }
```

### Admin Endpoints

```typescript
// Update interactive moments
PATCH /admin/content/:contentId/interactive-moments
Body: { moments: InteractiveMoment[] }

// Extract character frame
POST /admin/content/extract-frame
Body: { content_id, timestamp }
Response: { frame_url: string }
```

## Data Models

### InteractiveMoment
```typescript
{
  timestamp: number;              // Seconds into video
  duration: number;               // Interaction window (default 30s)
  scene_context: string;          // Scene description for AI
  character_name: string;         // e.g., "Moshe Rabbenu"
  character_frame_url?: string;   // GCS URL of character image
  interaction_prompt: string;     // e.g., "Ask Moshe about..."
}
```

### InteractionSession
```typescript
{
  id: string;
  character_name: string;
  dialogue_exchanges: DialogueExchange[];
  status: 'active' | 'recording' | 'completed';
}
```

### DialogueExchange
```typescript
{
  speaker: 'user' | 'character';
  message_text: string;
  audio_url?: string;             // Character only
  animated_video_url?: string;    // Character only
  timestamp: string;
}
```

## Styling

All components use **@bayit/glass** design system:
- `GlassCard` - Container with glassmorphic effect
- `GlassButton` - Styled buttons with variants
- `GlassInput` - Form inputs

**Glass UI Variants:**
- `primary` - Main action buttons
- `secondary` - Secondary actions
- `danger` - Delete/destructive actions

## Integration Checklist

### For VOD Pages

- [ ] Import `VODInteractionPlayer`
- [ ] Replace standard `<video>` element
- [ ] Pass `contentId`, `profileId`, `avatarId`
- [ ] Handle `onInteractionComplete` callback
- [ ] Test interactive moment detection
- [ ] Verify avatar display integration

### For Admin Pages

- [ ] Import `InteractiveMomentEditor`
- [ ] Add button to open editor
- [ ] Pass `contentId` and `videoUrl`
- [ ] Test frame extraction
- [ ] Verify moment saving
- [ ] Check content update in frontend

## Testing

### Manual QA

1. **Interactive Moment Detection**
   - [ ] Video auto-pauses at timestamp
   - [ ] Prompt displays with character info
   - [ ] Skip button resumes video
   - [ ] Start button begins interaction

2. **Live Interaction**
   - [ ] Message sends successfully
   - [ ] Character response plays
   - [ ] Animated video displays
   - [ ] Conversation history updates
   - [ ] End interaction resumes video

3. **Admin Curation**
   - [ ] Video preview loads
   - [ ] "Use Current Time" sets timestamp
   - [ ] Frame extraction works
   - [ ] Moment saves to database
   - [ ] Frontend detects new moment

### Integration Test Script

```typescript
// Test interactive moment detection
const testMomentDetection = async () => {
  const player = render(
    <VODInteractionPlayer
      contentId="test-content"
      videoUrl="test.mp4"
      profileId="test-profile"
      avatarId="test-avatar"
    />
  );

  // Seek to interactive moment
  const video = player.getByRole('video');
  video.currentTime = 60; // Assume moment at 60s

  // Wait for prompt
  await waitFor(() => {
    expect(screen.getByText(/Start Interaction/)).toBeInTheDocument();
  });
};
```

## Performance Considerations

### Video Loading
- Interactive moments loaded once on component mount
- Cached in component state
- No re-fetch during playback

### Character Video Playback
- Animated videos pre-generated by backend
- Loaded on-demand when character responds
- Auto-removed from DOM after playback

### Message Sending
- Debounced to prevent rapid-fire submissions
- Loading state disables input during processing
- Optimistic UI updates for user messages

## Known Limitations

1. **Single Interaction Per Moment**
   - Each moment can only be triggered once per session
   - User must refresh to re-trigger

2. **30-Second Window**
   - Interaction window auto-closes after duration
   - Not configurable per-moment (future enhancement)

3. **No Offline Support**
   - Requires active connection for character responses
   - No caching of animated videos

## Future Enhancements

- [ ] Reel generation UI
- [ ] Share reel functionality
- [ ] Multiple interactions per moment
- [ ] Voice input support
- [ ] Real-time character lip-sync
- [ ] Background music during interaction
- [ ] Interaction history viewer

## Files Created

```
web/src/
├── components/
│   ├── admin/
│   │   └── InteractiveMomentEditor.tsx     (197 lines)
│   └── vod-interactions/
│       ├── index.ts                         (6 lines)
│       ├── InteractiveMomentPrompt.tsx      (52 lines)
│       ├── InteractionOverlay.tsx           (136 lines)
│       ├── VODInteractionPlayer.tsx         (98 lines)
│       └── VODInteractionExample.tsx        (40 lines)
└── hooks/
    └── useVODInteraction.ts                 (197 lines)
```

**Total:** 726 lines across 7 files

## Support

For questions or issues:
- Review backend API: `/docs/features/VOD_AVATAR_TESTING_RESULTS.md`
- Check Creatify integration: `/backend/app/core/creatify_client.py`
- Test backend: `poetry run python test_creatify_existing.py`
