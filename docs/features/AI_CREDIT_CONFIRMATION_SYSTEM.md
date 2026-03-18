# AI Credit Confirmation System -- Design Document

## Understanding Summary

- **What**: A unified AI credit confirmation system for tvOS, replacing ad-hoc per-feature dialogs with one reusable `TVAICreditConfirmDialog` driven by `AIFeatureDescriptor` structs
- **Why**: Features currently show the wrong confirmation dialog (Catch Up dialog appearing for subtitles); each feature bypasses or duplicates credit logic ad-hoc
- **Who**: Bayit+ tvOS users (free and Plus tier), rolling out to iOS/Web/Android later
- **Key constraints**: One reusable component; two charge models (one-time and continuous/block); adaptive block sizing for dubbing (25% of balance, min 60)
- **Deduction flow**: Show cost + current balance + post-deduction balance; if insufficient, accept button redirects to upgrade flow
- **Live dubbing lifecycle**: Pre-authorize adaptive block, pause and re-prompt when block depletes
- **Non-goals**: Not redesigning backend credit service; not touching other platforms yet; not adding new AI features

## Assumptions

1. Backend `BetaCreditService.authorize()` + `deduct_credits()` flow is correct and reused (no backend changes for the dialog)
2. Adaptive block formula (25% of balance, min 60) calculated client-side before calling authorize
3. Plus users still see confirmation dialog (they just have more credits)
4. Existing `TVInsufficientCreditsModal` remains as-is, triggered from the new dialog's accept action
5. Feature rates (dubbing=1.0/sec, subtitle=15.0, catch-up=1.0) come from config/API, not hardcoded in client

## Data Model

### CreditChargeModel

```swift
enum CreditChargeModel {
    case oneTime(cost: Double)
    case blockBased(ratePerSecond: Double, minimumBlock: Int)
}
```

### AIFeatureDescriptor

```swift
struct AIFeatureDescriptor {
    let featureKey: String          // e.g. "live_dubbing", "catchup_summary"
    let iconSystemName: String      // SF Symbol name
    let localeKeyPrefix: String     // e.g. "ai.confirm.dubbing"
    let chargeModel: CreditChargeModel
}
```

The `localeKeyPrefix` resolves to:

- `{prefix}.title` -- feature name
- `{prefix}.description` -- what it does
- `{prefix}.costLabel` -- charge explanation
- `{prefix}.continueTitle` -- reauthorization title (block-based only)

### Registered Features

| Feature      | featureKey            | icon                     | chargeModel                       |
| ------------ | --------------------- | ------------------------ | --------------------------------- |
| Live Dubbing | `live_dubbing`        | `waveform.badge.mic`     | `.blockBased(rate: 1.0, min: 60)` |
| Subtitle Gen | `subtitle_generation` | `sparkles`               | `.oneTime(cost: 15.0)`            |
| Catch-Up     | `catchup_summary`     | `clock.arrow.circlepath` | `.oneTime(cost: 1.0)`             |

## Coordinator Logic

```
CreditConfirmationCoordinator (@Observable)

present(feature: AIFeatureDescriptor, balance: CreditBalance)
  - Compute effectiveCost:
    - oneTime: use cost directly
    - blockBased: min(balance.remaining * 0.25, max(60, balance.remaining))
  - Compute postDeductionBalance: balance.remaining - effectiveCost
  - Set insufficientCredits: postDeductionBalance < 0
  - Set state -> .showing(descriptor, effectiveCost, balance, postDeduction)

onAccept()
  - If insufficientCredits -> navigate to upgrade flow
  - Else -> call onConfirmed(feature, effectiveCost) callback

onDecline()
  - Dismiss, call onDeclined() callback

presentReauthorization(feature, updatedBalance)
  - Same as present(), description changes to "Continue?" variant
```

The coordinator is presentation-only. It computes display values and delegates actual deduction to the caller via callbacks. The player/feature view model handles the `BetaCreditService` call.

## Dialog View

`TVAICreditConfirmDialog` -- one reusable view, content-driven by coordinator state.

### Layout (top to bottom)

1. Feature icon (SF Symbol, tinted primary purple)
2. Feature title (from locale `{prefix}.title`)
3. Feature description (from locale `{prefix}.description`)
4. Cost badge row:
   - Cost: `"{effectiveCost} credits"` (left)
   - Balance after: `"{postDeductionBalance} credits"` (right, red if negative)
5. Current balance bar (progress visualization)
6. Action buttons:
   - Accept: purple background, shows cost in label. If insufficient, label changes to "Upgrade to Plus"
   - Decline: subtle glass button, "Not Now"

### Focus

`@FocusState` with `.accept` / `.decline`, default focus on `.accept`. Card button style, purple glow, scale effect (matching existing tvOS patterns).

### Reauthorization Variant

When `isReauthorization` is true, title uses `{prefix}.continueTitle` locale key and description shows elapsed usage.

## Integration Points

### Where the dialog gets triggered (tvOS)

1. **Catch-Up**: `TVCatchUpAutoPromptView` presents dialog with `catchup_summary` descriptor. Countdown timer pauses while dialog is shown. On confirm, existing `CatchUpIntegration.generate_catchup_with_credits()` is called.

2. **Subtitle Generation**: `TVPlayerView` subtitle mode selection presents dialog with `subtitle_generation` descriptor instead of `TVAIGenerationConfirmDialog`. On confirm, existing generation logic proceeds.

3. **Live Dubbing**: `TVPlayerView` dubbing toggle presents dialog with `live_dubbing` descriptor and computed block cost. On confirm, start dubbing. When block depletes, dubbing service calls `coordinator.presentReauthorization()` to pause and re-prompt.

### What gets deleted

- `TVAIGenerationConfirmDialog.swift` -- fully replaced
- Credit-specific UI in `TVCatchUpAutoPromptView+Sections.swift` -- `creditCostBadge` moves into unified dialog

### What stays

- `TVCatchUpAutoPromptView` itself (the "Just Joined?" prompt) -- accept action opens credit dialog first
- `TVInsufficientCreditsModal` -- still used as full upgrade flow destination
- `BetaCreditsViewModel` -- still provides balance data

## Locale Keys

New keys under `ai.confirm` namespace (all 10 language files):

```
ai.confirm.title.default          "Confirm AI Feature"
ai.confirm.cost                   "Cost: {{cost}} credits"
ai.confirm.balanceAfter           "Balance after: {{balance}} credits"
ai.confirm.balanceInsufficient    "Not enough credits"
ai.confirm.accept                 "Confirm ({{cost}} credits)"
ai.confirm.acceptUpgrade          "Upgrade to Plus"
ai.confirm.decline                "Not Now"

ai.confirm.dubbing.title          "Live Dubbing"
ai.confirm.dubbing.description    "AI-powered real-time dubbing in your language"
ai.confirm.dubbing.costLabel      "~1 credit per second"
ai.confirm.dubbing.continueTitle  "Continue Dubbing?"

ai.confirm.subtitle.title         "AI Subtitle Generation"
ai.confirm.subtitle.description   "Generate enhanced subtitles with AI"
ai.confirm.subtitle.costLabel     "15 credits"

ai.confirm.catchup.title          "Catch Me Up"
ai.confirm.catchup.description    "AI summary of what you missed"
ai.confirm.catchup.costLabel      "1 credit"
```

## Decision Log

| #   | Decision                                                        | Alternatives Considered                           | Rationale                                                                                            |
| --- | --------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Unified redesign to fix inconsistencies                         | Add per-feature dialogs ad-hoc                    | Existing system has wrong dialogs appearing for wrong features; unified approach prevents recurrence |
| 2   | tvOS first, then roll out to other platforms                    | All platforms simultaneously                      | Reduces risk, validates design on one platform before propagating                                    |
| 3   | Three active features: dubbing, subtitles, catch-up             | All 12 features from rate table                   | Only these three are user-facing on tvOS today; YAGNI                                                |
| 4   | Pre-authorize adaptive block for dubbing (25% balance, min 60)  | Fixed block (60/120/300), per-second silent drain | Prevents single auth from draining balance; adapts to user's remaining credits                       |
| 5   | Pause and re-prompt when block depletes                         | Auto-authorize next block, hard stop              | Keeps user in control without silently draining or abruptly cutting off                              |
| 6   | Feature Registry pattern with AIFeatureDescriptor               | Protocol-based strategy, backend-driven config    | Simplest approach for 3 features; one struct per feature, no new abstractions or endpoints           |
| 7   | One reusable TVAICreditConfirmDialog                            | Per-feature bespoke dialogs                       | Same layout fits all features; content driven by descriptor                                          |
| 8   | Show cost + current balance + post-deduction balance            | Cost only, cost + balance only                    | Full transparency helps user make informed decision                                                  |
| 9   | Insufficient credits: accept button becomes upgrade CTA         | Disable button, skip dialog entirely              | User still sees feature info and cost, smooth path to upgrade                                        |
| 10  | Coordinator is presentation-only, delegates deduction to caller | Coordinator calls backend directly                | Keeps separation of concerns; existing deduction logic stays intact                                  |
| 11  | Delete TVAIGenerationConfirmDialog, subsume catch-up credit UI  | Keep old dialogs alongside new one                | Eliminates duplicate code and source of original bug                                                 |
