#if os(tvOS)

    import BayitLocalization
    import Foundation

    /// Settings hub sidebar categories.
    enum TVSettingsCategory: String, CaseIterable, Hashable {
        case account
        case preferences
        case playback
        case security
        case social
        case help
    }

    /// All navigation destinations reachable from the Profile tab.
    /// Used with NavigationStack path-based routing.
    enum TVProfileDestination: Hashable {
        /// Settings hub (unified sidebar)
        case settingsHub(category: TVSettingsCategory = .account)

        // My Content
        case favorites
        case recordings
        case playlists
        case history

        // Social
        case friends
        case messages

        // Profile management
        case editProfile
        case avatarPicker
        case household
        case connectedAccounts
        case contentSources
        case widgets

        // Security sub-screens (pushed from Settings hub)
        case changePassword
        case phoneVerification
        case deleteAccount
        case passkeys
        case linkAccount
        case activeSessions

        // Help sub-screens (pushed from Settings hub)
        case helpChat
        case helpTutorials

        /// Label shown in the breadcrumb trail.
        func breadcrumbLabel(_ localization: LocalizationManager) -> String {
            switch self {
            case .settingsHub: return localization.t("nav.settings")
            case .favorites: return localization.t("favorites.title")
            case .recordings: return localization.t("profile.recordings")
            case .playlists: return localization.t("profile.playlists")
            case .history: return localization.t("profile.history")
            case .friends: return localization.t("nav.friends")
            case .messages: return localization.t("profile.messages")
            case .editProfile: return localization.t("profile.editProfile")
            case .avatarPicker: return localization.t("avatar.choose")
            case .household: return localization.t("profile.household")
            case .connectedAccounts: return localization.t("profile.connectedAccounts")
            case .contentSources: return localization.t("byoc.settings.title")
            case .widgets: return localization.t("nav.widgets")
            case .changePassword: return localization.t("profile.changePassword")
            case .phoneVerification: return localization.t("profile.phoneVerification")
            case .deleteAccount: return localization.t("profile.deleteAccount")
            case .passkeys: return localization.t("settings.passkeys")
            case .linkAccount: return localization.t("profile.linkAccount")
            case .activeSessions: return localization.t("profile.connectedDevices")
            case .helpChat: return localization.t("settings.help.chatWithAI")
            case .helpTutorials: return localization.t("settings.help.videoTutorials")
            }
        }
    }

#endif
