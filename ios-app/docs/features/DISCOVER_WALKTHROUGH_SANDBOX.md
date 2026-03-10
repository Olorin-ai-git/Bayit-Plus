# Discover "Try It Now" Walkthrough Sandbox

**Date:** 2026-03-10
**Status:** Design Complete, Ready for Implementation

## Understanding Summary

- **What:** A sandbox walkthrough system for all 19 Discover tab AI features. "Try it now" opens the real feature screen (player, chatbot, search, etc.) with coach mark overlays guiding the user through the feature step-by-step.
- **Why:** Users need to actually experience each AI feature in a guided, zero-risk environment before committing to using it with their own content/credits.
- **Who:** Bayit+ users exploring AI features via the Discover tab, on both iOS and tvOS.
- **Player-context features:** Backend provides a curated `walkthroughContentId` per feature. App auto-starts playback of that content, then overlays coach marks once the player is ready.
- **Standalone features:** App navigates to the real screen (chatbot, glossary, etc.) and overlays coach marks on the actual UI.
- **Interaction model:** Self-paced guided tour. Coach marks highlight UI elements and explain, user advances manually with Next/Done. Can optionally try actions but progression is not blocked.
- **Credit protection:** Global `X-Walkthrough` header on all API calls during walkthrough mode. Backend also validates server-side via walkthrough session token; auto-refunds any accidental credit consumption.

## Assumptions

- The `walkthroughContentId` will be set per feature in the backend config -- features without it will not show "Try it now"
- Existing `WalkthroughStep.targetAccessibilityId` values will map to real `accessibilityIdentifier` values already on target views (or we'll add them)
- The `.walkthroughTarget(id:)` SwiftUI modifier + preference key approach works on both iOS and tvOS
- The `CoachMarkOverlay` component (already built) will be reused and enhanced
- A walkthrough session token is created when walkthrough starts and sent with API calls for backend-side credit protection
- Brief loading states (spinner/fade) are acceptable when waiting for player readiness or step transitions

## Architecture

### 1. Walkthrough Session Lifecycle

**Entry point:** User taps "Try it now" on a Discover feature detail sheet.

**Flow:**

1. `DiscoverViewModel.startWalkthroughSession(for: feature)` is called
2. Creates a `WalkthroughSession` (new type) that encapsulates:
   - The `WalkthroughStateMachine` (existing, manages step state)
   - A `sessionToken` (UUID string, sent to backend for credit protection)
   - The resolved target: either a `walkthroughContentId` (player features) or a `deepLinkRoute` (standalone features)
3. Registers the session with `WalkthroughSessionManager` (new singleton `@Observable` class) -- sets `isActive = true`, stores the session token
4. The `APIClient` checks `WalkthroughSessionManager.isActive` on every request. When true, attaches `X-Walkthrough: {sessionToken}` header.
5. Dismiss the detail sheet
6. Navigate to the target screen:
   - **Player features:** Deep link to `bayitplus://play/{walkthroughContentId}?walkthrough={featureId}`
   - **Standalone features:** Deep link to the feature's route (e.g., `bayitplus://chatbot?walkthrough={featureId}`)
7. The target screen detects walkthrough mode via `WalkthroughSessionManager.shared` and shows the `CoachMarkOverlay`
8. On Done/Skip, `WalkthroughSessionManager` clears the session, header injection stops

**Exit triggers:** User taps Done, Skip, navigates away, or the app backgrounds.

### 2. WalkthroughSessionManager & API Integration

**`WalkthroughSessionManager`** -- new file in `Packages/BayitCore/Sources/BayitCore/Discover/`

```swift
@Observable @MainActor
public final class WalkthroughSessionManager {
    public static let shared = WalkthroughSessionManager()

    public private(set) var activeSession: WalkthroughSession?

    public var isActive: Bool { activeSession != nil }
    public var sessionToken: String? { activeSession?.sessionToken }
    public var currentFeatureId: String? { activeSession?.featureId }

    func start(session: WalkthroughSession)
    func end()
}
```

**`WalkthroughSession`** -- lightweight struct:

```swift
public struct WalkthroughSession {
    public let featureId: String
    public let sessionToken: String  // UUID
    public let stateMachine: WalkthroughStateMachine
}
```

**APIClient integration** -- in the existing `APIClient` (BayitNetworking package), add a check before every request:

```swift
if WalkthroughSessionManager.shared.isActive,
   let token = WalkthroughSessionManager.shared.sessionToken {
    request.addValue(token, forHTTPHeaderField: "X-Walkthrough")
}
```

Single injection point. No feature ViewModel changes needed.

**Backend contract:**

- Backend receives `X-Walkthrough: {sessionToken}`
- Validates it's a legitimate UUID
- Skips credit deduction for that request
- If credits were accidentally consumed (race condition), auto-refunds by session token

### 3. Coach Mark Targeting with Preference Keys

**`.walkthroughTarget(id:)` modifier** -- new file in `Packages/BayitDesignSystem/Sources/BayitDesignSystem/CoachMark/`

```swift
struct WalkthroughTargetPreferenceKey: PreferenceKey {
    static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout ..., nextValue: ...)
}

extension View {
    public func walkthroughTarget(id: String) -> some View
}
```

Usage on any target view:

```swift
subtitleLabel
    .accessibilityIdentifier("discover_interactive_subtitles_step2")
    .walkthroughTarget(id: "discover_interactive_subtitles_step2")
```

The hosting screen collects `.onPreferenceChange(WalkthroughTargetPreferenceKey.self)` into a `[String: CGRect]` dictionary, looks up the current step's `targetAccessibilityId`, and feeds the frame into `CoachMarkOverlay`.

When a target frame is not found, the overlay shows instruction text centered without a spotlight cutout -- graceful degradation.

### 4. Screen-Level Walkthrough Integration

**`.walkthroughOverlay()` modifier** -- reusable modifier that handles the full integration:

```swift
extension View {
    public func walkthroughOverlay(
        featureId: String,
        localize: (String) -> String,
        isReady: Bool = true
    ) -> some View
}
```

This modifier:

1. Reads `WalkthroughSessionManager.shared` from environment
2. If active session matches `featureId`, collects `WalkthroughTargetPreferenceKey` preferences
3. Renders `CoachMarkOverlay` with resolved frames and localized instruction text
4. Wires Next/Skip/Done to the session's state machine
5. On Done/Skip, calls `WalkthroughSessionManager.shared.end()`
6. If no active session for this feature, renders nothing

Usage on any screen:

```swift
PlayerView(contentId: contentId)
    .walkthroughTarget(id: "discover_pause_ask_step1")
    .walkthroughOverlay(featureId: "pause_ask", localize: localization.t)
```

Player-specific: accepts `isReady` binding for waiting on playback readiness.

### 5. Navigation Flow

1. User taps "Try it now" in detail sheet
2. `DiscoverViewModel.startWalkthroughSession(for: feature)` creates session, registers with manager, resolves URL
3. Detail sheet dismisses
4. Deep link navigation to target screen
5. Target screen's `.walkthroughOverlay()` detects active session and shows coach marks
6. Done/Skip/navigate away ends session

No deep link router changes needed for the `walkthrough` query param. The session manager is the source of truth. The query param is a defensive fallback only.

## File Plan

### New Files (5)

| File                                  | Location                                    | Lines (est.) | Purpose                                                 |
| ------------------------------------- | ------------------------------------------- | ------------ | ------------------------------------------------------- |
| `WalkthroughSession.swift`            | `Packages/BayitCore/.../Discover/`          | ~25          | Struct: featureId, sessionToken, stateMachine           |
| `WalkthroughSessionManager.swift`     | `Packages/BayitCore/.../Discover/`          | ~60          | Singleton: start/end session, isActive, token           |
| `WalkthroughTargetModifier.swift`     | `Packages/BayitDesignSystem/.../CoachMark/` | ~50          | PreferenceKey + `.walkthroughTarget(id:)` modifier      |
| `WalkthroughOverlayModifier.swift`    | `Packages/BayitDesignSystem/.../CoachMark/` | ~80          | `.walkthroughOverlay()` modifier                        |
| `DiscoverViewModel+Walkthrough.swift` | `BayitPlusApp/ViewModels/`                  | ~50          | `startWalkthroughSession(for:)`, session URL resolution |

### Modified Files

| File                                | Change                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| `APIClient` (BayitNetworking)       | ~5 lines: check `WalkthroughSessionManager`, attach header     |
| `DiscoverFeatureDetailView.swift`   | ~5 lines: call `startWalkthroughSession`                       |
| `TVDiscoverFeatureDetailView.swift` | ~5 lines: same                                                 |
| Player view(s)                      | ~3 lines: add `.walkthroughOverlay()` + `.walkthroughTarget()` |
| Chatbot view                        | ~3 lines: same                                                 |
| Search view                         | ~3 lines: same                                                 |
| ~10 more feature screens            | ~3 lines each: same pattern                                    |

### Not Changed

- `CoachMarkOverlay.swift` (already works)
- `WalkthroughStateMachine.swift` (already works)
- `DiscoverFeatureCatalog` (step definitions already exist)

## Decision Log

| #   | Decision                                                            | Alternatives Considered                                      | Why This Option                                                      |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | Real UI with coach marks, not simulation                            | (B) Mock/simulated sandbox, (C) Hybrid                       | User wants to experience the actual feature, not a replica           |
| 2   | Backend provides curated `walkthroughContentId` for player features | (B) User picks content, (C) Use current content              | Curated content guarantees the feature is showcased well             |
| 3   | Self-paced guided tour, not action-gated                            | (A) Action-gated progression, (C) Mixed                      | Avoids frustration during playback timing; user advances at own pace |
| 4   | Same coach mark pattern for all 19 features                         | (B) Standalone features skip coach marks                     | Consistent UX across all features                                    |
| 5   | Global observable flag for X-Walkthrough header                     | (B) Per-ViewModel flag, (C) Scoped APIClient                 | Single injection point, no feature ViewModel changes needed          |
| 6   | Backend double-checks with session token + auto-refund              | (A) Header only, (C) Separate API paths                      | Defense in depth for credit protection without API duplication       |
| 7   | SwiftUI preference keys for frame targeting                         | (B) UIKit accessibility tree, (C) Approximate area highlight | Pure SwiftUI, works on both platforms, idiomatic                     |
| 8   | Hide "Try it now" when walkthroughContentId missing                 | (B) "Coming soon" message, (C) Fall back to raw navigation   | Honest UX, no broken promises                                        |
| 9   | Reusable `.walkthroughOverlay()` modifier                           | Per-screen duplicate integration                             | Single implementation, ~3 lines per screen to adopt                  |
| 10  | Session manager is source of truth, not query params                | Query param parsing on each screen                           | Centralized state, no parsing duplication                            |

## Risks

| Risk                                                             | Mitigation                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `walkthroughContentId` not set for features at launch            | Button hidden -- feature still has description + demo video                                        |
| Preference key frames stale after scroll/rotation                | `onPreferenceChange` fires on layout changes; graceful fallback to centered text without spotlight |
| Player takes too long to reach ready state                       | Loading indicator shown; timeout after 10s falls back to centered coach marks                      |
| `WalkthroughSessionManager.shared` singleton complicates testing | Protocol-based, injectable via environment for tests                                               |
