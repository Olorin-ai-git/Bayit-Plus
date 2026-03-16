# tvOS Profile UI Consistency -- Design & Implementation Plan

## Understanding

Unify all Profile child screens to use consistent navigation and visual treatment within the Profile tab. Currently 5 different header patterns, 4 different background treatments, and a mix of fullScreenCovers. All child screens must push within a NavigationStack inside the Profile tab -- no fullScreenCovers anywhere.

## Key Decisions

1. Settings, Preferences, Security merge into one TVSettingsHubView with shared sidebar (Account, Preferences, Security, Social, Help)
2. Playback nested inside Preferences, not top-level
3. No fullScreenCovers -- everything pushes within Profile tab NavigationStack
4. Back button (Siri Remote Menu) + breadcrumb trail for navigation
5. TVProfileChildContainer provides uniform background + breadcrumb + exit handling
6. Custom gradients removed -- uniform DesignTokens.Background.primary
7. Design images define visual treatment only, not navigation hierarchy

## Architecture

```
TVProfileView (root)
  NavigationStack(path: $navigationPath)
    TVProfileDashboard (root -- 3-column layout)
    .settingsHub(category:) -> TVSettingsHubView
      sidebar: Account, Preferences, Security, Social, Help
      content: switches panel based on selected category
    .favorites -> TVFavoritesView
    .recordings -> TVRecordingsView
    .playlists -> TVWatchlistView
    .history -> TVViewingHistoryView
    .friends -> TVFriendsView
    .messages -> TVDirectMessagesView
    .editProfile -> TVEditProfileView
    .avatarPicker -> TVAvatarPickerView
    .household -> TVHouseholdProfilesView
    .connectedAccounts -> TVConnectedAccountsView
    .contentSources -> TVBYOCSourceListView
    .widgets -> TVWidgetsView
```

Deeper navigation (e.g. Settings > Change Password) pushes further onto the same NavigationStack. Breadcrumb: "Profile > Settings > Change Password".

## New Components

### TVProfileDestination (enum)

Routing enum with cases for every child screen. Hashable. Each case provides a `breadcrumbLabel: String`.

### TVBreadcrumbBar

- Back arrow: chevron.left in circle, 44pt target, pops NavigationStack
- Trail: ancestors tappable (pop to that level), current label not tappable
- Typography: TVDesignTokens.FontSize.sm, muted ancestors, primary current
- Height: ~60pt fixed, does not scroll

### TVProfileChildContainer

Wrapper view providing:

- DesignTokens.Background.primary base
- TVBreadcrumbBar at top
- Content area below
- onExitCommand wired to pop

Every child view stripped of its own background, header, and exit handling.

### TVSettingsHubView

Unified sidebar + content panel:

- Sidebar: 280pt, dark glass background, 5 category rows with tvCardStyle focus
- Account panel: Billing, Subscription, Edit Profile rows
- Preferences panel: Language, Playback, Notifications, Audio & Subtitles, Accessibility
- Security panel: Change Password, 2FA, Connected Devices, Privacy, Connected Accounts, Passkeys
- Social panel: Friends settings, DM settings, Watch Party settings
- Help panel: Quick Tips, Common Questions, Chat with AI, Video Tutorials, Contact

Pre-selectable via initialCategory parameter.

## Visual Families

### Sidebar + Content (Settings Hub only)

- Sidebar: dark glass (Color(red: 0.06, green: 0.04, blue: 0.14) + ultraThinMaterial), 280pt
- Content rows: Glass.bgLight + 1px white 0.08 border + Radius.lg
- Row layout: icon (purple, 48pt) + title/subtitle + trailing value/chevron/toggle

### Centered Content (everything else)

- No sidebar, full width below breadcrumb
- Glass card styling matches Settings rows
- Each screen owns its internal layout (grid, list, form)

## Phases

### Phase 1: Foundation

Files to create:

- BayitPlusTVApp/Navigation/TVProfileDestination.swift
- BayitPlusTVApp/Components/TVBreadcrumbBar.swift
- BayitPlusTVApp/Components/TVProfileChildContainer.swift

Files to modify:

- BayitPlusTVApp/Views/Profile/TVProfileView.swift -- replace body with NavigationStack

No visual change to end user. Dashboard renders identically.

### Phase 2: Settings Hub

Files to create:

- BayitPlusTVApp/Views/Settings/TVSettingsHubView.swift
- BayitPlusTVApp/Views/Settings/TVSettingsHubView+Panels.swift

Files to modify:

- TVProfileView+Dashboard.swift -- wire Preferences/Security/AppSettings buttons to push .settingsHub(initialCategory:)
- TVProfileView.swift -- add navigationDestination for .settingsHub

Content migrated from:

- TVPreferencesView.swift (language, playback, notification, audio, accessibility panels)
- TVSettingsView.swift + TVSettingsView+Sections.swift (account, social panels)
- TVSecurityView.swift + TVSecurityView+Panels.swift (security panels)

### Phase 3: Content Screens

Files to modify (strip header/background, content only):

- TVFavoritesView -- strip profileSheetWrapper dependency
- TVRecordingsView -- strip profileSheetWrapper dependency
- TVWatchlistView -- strip profileSheetWrapper dependency
- TVViewingHistoryView -- strip TVProfileSheetHeader + background
- TVFriendsView -- strip profileSheetWrapper dependency
- TVDirectMessagesView -- strip profileSheetWrapper dependency

Wire as navigationDestinations in TVProfileView.

### Phase 4: Form Screens

Files to modify (strip header/background/NavigationStack):

- TVEditProfileView -- strip background + custom header
- TVAvatarPickerView -- strip background + custom header
- TVChangePasswordView -- strip background + custom header
- TVPhoneVerificationView -- strip background + custom header
- TVDeleteAccountView -- strip background + custom header
- TVPasskeysView -- strip NavigationStack + toolbar (biggest change)
- TVLinkAccountView -- strip NavigationStack + toolbar
- TVActiveSessionsView -- strip TVProfileSheetHeader + background

### Phase 5: Standalone Screens

Files to modify:

- TVHouseholdProfilesView -- strip background, convert internal fullScreenCover to NavigationStack push
- TVConnectedAccountsView -- strip custom header + background
- TVBYOCSourceListView -- strip background (isEmbedded mode already exists)
- TVWidgetsView -- strip profileSheetWrapper dependency

### Phase 6: Cleanup

Files to delete or gut:

- TVProfileView+SheetRouter.swift -- delete (no more sheet routing)
- TVPreferencesTabView.swift -- delete (absorbed into hub)
- ProfileSheet enum -- delete
- TVPreferencesView.swift -- delete (absorbed into hub)
- TVSettingsView.swift -- delete (absorbed into hub)
- TVSecurityView.swift -- delete (absorbed into hub)

Files to keep but update:

- TVProfileSheetHeader.swift -- keep component, may be used outside Profile

## Files Affected Summary

New files: 4
Modified files: ~25
Deleted files: ~6
Total: ~35 file operations across 6 phases

## Design Reference Images

- Profile dashboard: 2026-03-14-tvos-profile-redesign.png
- Settings visual: 2026-03-14-10-02-00-tvos-settings-redesign.png
- Preferences visual: 2026-03-14-10-02-02-tvos-preferences-redesign.png
- Security visual: 2026-03-14-10-03-00-tvos-security-redesign.png
- Connected Accounts visual: 2026-03-14-10-03-01-tvos-connected-accounts-redesign.png
- Household visual: 2026-03-14-10-02-01-tvos-household-redesign.png
- Help visual: 2026-03-14-10-02-03-tvos-help-redesign.png
