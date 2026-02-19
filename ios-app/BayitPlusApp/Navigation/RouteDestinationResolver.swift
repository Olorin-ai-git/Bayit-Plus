import BayitVoice
import SwiftUI

/// Resolves Route enum values to their destination SwiftUI views.
/// Extracted from MainTabView to keep each file under 200 lines.
struct RouteDestinationResolver {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos

    @ViewBuilder
    func view(for route: Route) -> some View {
        switch route {
        case .movieDetail(let movieId):
            MovieDetailView(movieId: movieId)
        case .seriesDetail(let seriesId):
            SeriesDetailView(seriesId: seriesId)
        case .collectionDetail(let collectionId):
            CollectionDetailView(collectionId: collectionId)
        case .podcastDetail(let showId):
            PodcastDetailView(showId: showId)
        case .epg:
            EPGView()
        case .profile:
            ProfileView()
        case .favorites:
            FavoritesView()
        case .playlist:
            PlaylistView()
        case .downloads:
            DownloadsView()
        case .recordings:
            RecordingsView()
        case .settings:
            SettingsView()
        case .languageSettings:
            LanguageSettingsView()
        case .notificationSettings:
            NotificationSettingsView()
        case .billing:
            BillingView()
        case .subscription:
            SubscriptionView()
        case .security:
            SecurityView()
        case .connectedAccounts:
            ConnectedAccountsView()
        case .playbackSettings:
            PlaybackSettingsView()
        case .audioSettings:
            AudioSettingsView()
        case .accessibilitySettings:
            AccessibilitySettingsView()
        case .privacySettings:
            PrivacySettingsView()
        case .children:
            ChildrenView()
        case .youngsters:
            YoungtersView()
        case .judaism:
            JudaismView()
        case .flows:
            FlowsView()
        case .morningRitual:
            MorningRitualView()
        case .voiceOnboarding:
            VoiceOnboardingView(speechService: SpeechRecognitionService())
        case .support:
            SupportView()
        case .trivia(let contentId):
            QuizOverlayView(contentId: contentId, profileId: nil, onDismiss: { coordinator.pop() })
        case .llmSearch:
            LLMSearchView()
        case .familyControls:
            FamilyControlsView()
        case .shabbatMode:
            ZmanimView()
        case .jerusalemContent:
            CultureContentView()
        case .telAvivContent:
            CultureContentView()
        case .audiobooks:
            AudiobooksView()
        case .audiobookDetail(let audiobookId):
            AudiobookDetailView(audiobookId: audiobookId)
        case .trending:
            TrendingView()
        case .interactiveSubtitles(let contentId):
            InteractiveSubtitlesView(contentId: contentId)
        case .chapters(let contentId):
            ChapterNavigationView(contentId: contentId)
        case .chatbot:
            ChatbotView(repository: repos.chat)
        case .avatarMode:
            AvatarModeView(stateMachine: AvatarStateMachine(), repository: repos.chat)
        case .betaCredits:
            CreditBalanceWidgetView()
        case .subscriptionGate(let contentId, let requiredTier):
            SubscriptionGateView(contentId: contentId, requiredTier: requiredTier)
        case .household:
            HouseholdView()
        case .devicePairing:
            DevicePairingView()
        case .helpCenter:
            HelpView()
        case .rewards:
            RewardsView()
        case .widgets:
            WidgetsView()
        case .radio:
            RadioView()
        case .onboardingAI:
            OnboardingAIView()
        case .friends:
            FriendsView(repository: repos.friends)
        case .watchParty:
            WatchPartyView(repository: repos.watchParty)
        case .watchPartyDetail:
            WatchPartyView(repository: repos.watchParty)
        case .chess(let gameId):
            ChessView(gameId: gameId)
        case .directMessages:
            DirectMessagesView()
        case .conversation(let friendId):
            ConversationView(friendId: friendId)
        case .mfaSetup:
            MFASetupView()
        case .phoneVerification:
            PhoneVerificationView()
        case .zehAni:
            ZehAniHubView()
        case .zehAniMagicMirror(let profileId):
            MagicMirrorView(profileId: profileId)
        case .zehAniV2V(let avatarId, let profileId):
            V2VPracticeView(avatarId: avatarId, profileId: profileId)
        case .zehAniAvatar3D(let avatarId):
            Avatar3DPreviewView(avatarImageUrl: avatarId)
        case .zehAniHighlights(let profileId):
            HighlightReelView(profileId: profileId)
        case .zehAniContacts(let profileId):
            ContactsManagementView(profileId: profileId)
        case .zehAniFeedback(let profileId):
            FeedbackInboxView(profileId: profileId)
        case .zehAniAvatarSettings(let profileId, let avatarId):
            AvatarSettingsView(profileId: profileId, avatarId: avatarId)
        case .zehAniMovieInteractions(let profileId):
            MovieInteractionsView(profileId: profileId)
        case .zehAniMovieCharacters(let profileId, let contentId):
            MovieCharactersView(profileId: profileId, contentId: contentId)
        case .zehAniCharacterDialogue(let profileId, let contentId, let characterName):
            CharacterDialogueView(profileId: profileId, contentId: contentId, characterName: characterName)
        case .tvLogin(let sessionId, let token, let expires):
            TVLoginView(sessionId: sessionId, token: token, expires: expires)
        default:
            ErrorStateView(
                message: "Screen not available",
                onRetry: { coordinator.pop() }
            )
        }
    }
}
