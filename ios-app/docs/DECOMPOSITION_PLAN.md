# tvOS View Decomposition Plan

## 1. TVZehAniHubView.swift (1053 lines -> 4 files)

Current: Hub coordinator + TVHighlightsView + TVContactsView + TVFeedbackView all in one file.

Extract:

- `TVZehAniHubView.swift` - Hub coordinator only (lines 1-199, ~199 lines) -- already under 200
- `TVZehAniHighlightsView.swift` - TVHighlightsView struct (lines 203-485, ~283 lines -> needs split into view + helpers)
- `TVZehAniContactsView.swift` - TVContactsView struct (lines 489-820, ~331 lines -> needs split into view + add sheet)
- `TVZehAniFeedbackView.swift` - TVFeedbackView struct (lines 824-1051, ~227 lines -> may need minor split)

Since extracted views exceed 200 lines, further decompose:

- `TVZehAniHighlightsView.swift` - main view (~200 lines)
- `TVZehAniContactsView.swift` - main list + card (~200 lines)
- `TVZehAniContactAddSheet.swift` - add contact sheet form (~100 lines)
- `TVZehAniFeedbackView.swift` - feedback view (~200 lines)

## 2. TVProfileView.swift (843 lines -> 4 files)

Replace 15 `@State private var showingX = false` with `ProfileSheet` enum.
Extract:

- `TVProfileView.swift` - Main coordinator with ProfileSheet enum (~195 lines)
- `TVProfileHeaderSection.swift` - Header + avatar + badges (~180 lines)
- `TVProfileSections.swift` - Stats, beta, quick actions, social sections (~200 lines)
- `TVProfileAccountSection.swift` - Account management, advanced, admin, sign out, helper views (~200 lines)

## 3. TVQRAuthViewModel.swift (664 lines -> 3 files)

Extract:

- `TVQRAuthViewModel.swift` - Main ViewModel with state + session lifecycle (~200 lines)
- `TVQRAuthPoller.swift` - Polling fallback logic as extension (~200 lines)
- `TVQRAuthWebSocket.swift` - WebSocket connection + message handling + ping (~200 lines)

## 4. TVSubtitleLanguagePickerView.swift (546 lines -> 3 files)

Extract:

- `TVSubtitleLanguagePickerView.swift` - Main picker view + PickerItem model (~200 lines)
- `TVSubtitleLanguageGrid.swift` - Language button, off button, split button views (~180 lines)
- `TVSubtitleAIGeneration.swift` - AI generation trigger + polling + cancel logic (~170 lines)

## 5. TVWidgetContainerView.swift (504 lines -> 3 files)

Extract:

- `TVWidgetContainerView.swift` - Main container + poster section (~200 lines)
- `TVWidgetContentViews.swift` - Info section, Ynet content, poster image/fallback, badge (~180 lines)
- `TVWidgetControls.swift` - Playback controls, control button, button styles, InlineAVPlayerLayerView (~170 lines)

## 6. TVHomeView.swift (424 lines -> 3 files)

Extract:

- `TVHomeView.swift` - Main view + hero/scroll setup + task/loading (~200 lines)
- `TVHomeContentSections.swift` - Category sections, continue watching, near me, trending, radio, live, city sections (~200 lines)
- (tvErrorState free function stays in TVHomeView.swift since it's small and used there)
