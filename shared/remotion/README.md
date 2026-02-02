# Remotion Wizard Animation System

Fluid, multi-gesture animation sequences for Bayit+ wizard using React-based video framework.

## Overview

This system uses [Remotion](https://www.remotion.dev/) to create smooth, multi-gesture animation flows from existing wizard spritesheets with particle effects and smooth transitions.

## Structure

```
shared/remotion/
├── Root.tsx                     # Remotion composition registry
├── compositions/
│   ├── gestures/                # 26 individual gesture compositions
│   ├── sequences/               # 7 multi-gesture animation flows
│   └── effects/                 # Particle effects and overlays
├── sprites/
│   ├── SpritesheetPlayer.tsx   # Core spritesheet renderer
│   └── SpritesheetConfig.ts    # Spritesheet configurations
├── utils/
│   ├── easing.ts               # Transition easing functions
│   ├── sequencing.ts           # Multi-gesture flow definitions
│   └── platform-adapter.ts     # Platform detection & feature flags
└── config/
    └── remotion.config.ts      # Global Remotion settings
```

## Quick Start

### Preview Animations (Development)

```bash
npm run remotion:preview
```

Opens Remotion Studio to preview all compositions.

### Render to MP4 (Production)

```bash
npm run remotion:render
```

Renders all sequences to `web/public/assets/animations/*.mp4`.

## Animation Sequences

### 1. summon_wizard (3.5s)
- puffs_in → greeting → attentive
- **Usage**: Wizard appears

### 2. dismiss_wizard (3s)
- farewell → puffs_out
- **Usage**: Wizard dismisses

### 3. process_command (6s)
- thinking → conjuring → presenting
- **Usage**: Processing user query

### 4. magical_reveal (6s)
- conjuring → magical_reveal → presenting
- **Usage**: Single result reveal

### 5. error_shake (3s)
- confused → shrugging
- **Usage**: No results or error

### 6. success (5.5s)
- success → cheering → clapping
- **Usage**: Successful action

### 7. acknowledge_new (2s)
- attentive → confirmation
- **Usage**: Acknowledge user input

## Phase 1: Foundation ✅

**Completed:**
- [x] Remotion dependencies installed
- [x] Directory structure created
- [x] SpritesheetConfig ported from WizardSprite.web.tsx
- [x] SpritesheetPlayer component
- [x] Easing functions
- [x] Sequencing utilities
- [x] Platform adapter
- [x] Remotion configuration
- [x] ParticleEmitter effect
- [x] Sample gesture compositions (Conjuring, Thinking)
- [x] Sample sequence (ProcessAndPresent)
- [x] Remotion Root registry
- [x] Render script

## Phase 2: Core Gestures ✅ (100% COMPLETE)

**Completed:**
- [x] **ALL 31 gesture compositions implemented (100%)**
  - [x] High priority (5): thinking, conjuring, greeting, presenting, browsing
  - [x] Medium priority (4): shrugging, confused, single_result, magical_reveal
  - [x] Essential for sequences (8): success, cheering, clapping, attentive, confirmation, farewell, puffs_in, puffs_out
  - [x] Large 6×6 grid (6): speaking, crying, smacking, listening, clarification, warning
  - [x] Wide 6×1 grid (3): agreement, disagreement, waiting
  - [x] Small spritesheets (2): emphatic, reading
  - [x] Idle behaviors (3): shifts_weight, adjusts_hat, looks_around
- [x] 2 effect components (ParticleEmitter, RuneSwirl)
- [x] All 7 animation sequences complete
  - [x] SummonWizardSequence
  - [x] DismissWizardSequence
  - [x] ProcessAndPresentSequence
  - [x] MagicalRevealSequence
  - [x] ErrorShakeSequence
  - [x] SuccessSequence
  - [x] AcknowledgeNewSequence

## Phase 3: State Management Integration ✅ (COMPLETE)

**Completed:**
- [x] Extended support store with RemotionAnimationState
  - [x] remotionEnabled: boolean (enable/disable Remotion)
  - [x] currentSequence: AnimationSequence | null (currently playing sequence)
  - [x] usePreRendered: boolean (platform-specific rendering mode)
  - [x] playbackSpeed: number (0.1-3.0, default 1.0)
  - [x] effectsIntensity: number (0.0-1.0, particle effects intensity)
- [x] Added Remotion actions to support store
  - [x] playAnimationSequence(sequence)
  - [x] stopAnimationSequence()
  - [x] setRemotionEnabled(enabled)
  - [x] setEffectsIntensity(intensity)
  - [x] setPlaybackSpeed(speed)
- [x] Created useRemotionWizard hook
  - [x] Provides easy React access to Remotion state
  - [x] playSequence, stopSequence actions
  - [x] isPlaying, currentSequence state
  - [x] getSequence helper for sequence definitions
- [x] Voice intent to animation mapping (voiceOrchestratorHelpers.ts)
  - [x] getAnimationSequenceForIntent(intent, context)
  - [x] getWakeUpSequence(), getDismissSequence()
  - [x] getErrorSequence(errorType)
  - [x] shouldAutoDismissAfterSequence(sequence)
  - [x] getSequenceTransitionDelay(from, to)

## Phase 4: Platform Players ✅ (COMPLETE)

**Completed:**
- [x] Web Player Component (`web/src/components/wizard/RemotionWizard.tsx`)
  - [x] Live rendering using `@remotion/player`
  - [x] 60fps smooth playback
  - [x] Playback speed control via PlayerRef
  - [x] Effects intensity via opacity
  - [x] Error fallback UI
  - [x] Loading state placeholder
  - [x] Auto-play with onEnded callback
- [x] Mobile Player Component (`mobile-app/src/components/wizard/RemotionWizard.native.tsx`)
  - [x] Pre-rendered MP4 playback using `react-native-video`
  - [x] Optimized buffering config for mobile
  - [x] Platform-specific rate control (iOS)
  - [x] Memory-efficient video playback
  - [x] Error handling with onError callback
  - [x] Muted audio (no sound in animations)
- [x] tvOS Player Component (`tvos-app/src/components/wizard/RemotionWizard.tvos.tsx`)
  - [x] Pre-rendered MP4 playback optimized for TV
  - [x] Larger default size (480px for 10-foot UI)
  - [x] Enhanced buffering for tvOS
  - [x] Focus navigation support
  - [x] Hardware acceleration (SurfaceView)
  - [x] High-quality playback settings
- [x] Progressive Enhancement Wrapper (`shared/components/support/WizardRenderer.tsx`)
  - [x] Automatic platform detection (web/mobile/tvOS)
  - [x] Feature detection via shouldUseRemotion()
  - [x] Graceful fallback to WizardSprite
  - [x] Backward compatibility maintained
  - [x] Dynamic imports for platform-specific players
  - [x] Voice state to gesture mapping

## Phase 5: Integration ✅ (COMPLETE)

**Completed:**
- [x] Voice Flow Orchestrator Hook (`shared/hooks/useVoiceFlowOrchestrator.ts`)
  - [x] Automatic sequence triggering on voice state changes
  - [x] Modal open → summon_wizard sequence
  - [x] Modal close → dismiss_wizard sequence
  - [x] Processing → speaking → animation based on intent
  - [x] Error states → error_shake sequence
  - [x] Response analysis (result count, success/failure)
  - [x] Sequence start/complete callbacks
- [x] VoiceChatModal Integration (`shared/components/support/VoiceChatModal.tsx`)
  - [x] Imported WizardRenderer component
  - [x] Added useVoiceFlowOrchestrator hook
  - [x] Remotion overlay rendering on top of existing sprite
  - [x] Full backward compatibility maintained
  - [x] Pointer events pass-through for overlay
  - [x] Development logging for sequence tracking
- [x] Complete User Interaction Flows
  - [x] Wake flow: User opens modal → summon_wizard plays
  - [x] Search flow: Processing → result-based animation
  - [x] Error flow: Network/not found → error_shake
  - [x] Success flow: Playback command → success celebration
  - [x] Dismissal flow: User closes modal → dismiss_wizard
  - [x] Seamless transitions between sequences and sprites

**Next Steps (Phase 6):**
- [ ] Cross-platform testing (web, iOS, Android, tvOS)
- [ ] Performance profiling and optimization
- [ ] Documentation updates for usage guidelines
- [ ] Optional: Additional context-aware sequences

## Usage

### In Code (Web)

```tsx
import { Player } from '@remotion/player';
import { ProcessAndPresentSequence } from '../shared/remotion/compositions/sequences/ProcessAndPresent';

<Player
  component={ProcessAndPresentSequence}
  durationInFrames={360}
  fps={60}
  compositionWidth={330}
  compositionHeight={362}
  controls={false}
  loop={false}
  autoPlay
/>
```

### Platform Support

| Platform | Rendering Mode | Method |
|----------|----------------|--------|
| **Web** | Live rendering | `@remotion/player` |
| **Mobile** | Pre-rendered | MP4 video playback |
| **tvOS** | Pre-rendered | MP4 video playback |

## Configuration

Edit `shared/remotion/config/remotion.config.ts`:

```typescript
export const REMOTION_CONFIG = {
  width: 330,
  height: 362,
  fps: 60,
  codec: 'h264',
  bitrate: '2M',
};
```

## Development

### Adding New Gestures

1. Create composition in `compositions/gestures/[Name]Gesture.tsx`
2. Register in `Root.tsx`
3. Add to render script (optional)

### Adding New Sequences

1. Define sequence in `utils/sequencing.ts`
2. Create composition in `compositions/sequences/[Name]Sequence.tsx`
3. Register in `Root.tsx`
4. Add to render script

### Testing

```bash
# Preview in browser
npm run remotion:preview

# Render single composition
npx remotion render shared/remotion/Root.tsx ProcessAndPresentSequence out.mp4
```

## Performance

**Target Metrics:**
- FPS: 60fps (composition) / 3-10fps (spritesheet frames)
- Memory: <150MB during playback
- File size: <1.5MB per sequence
- Load time: <2s for sequence start

## Resources

- [Remotion Documentation](https://www.remotion.dev/)
- [Remotion Player API](https://www.remotion.dev/docs/player)
- [Implementation Plan](../../docs/features/REMOTION_WIZARD_ANIMATIONS.md)
