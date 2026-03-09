import BayitBYOC
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
        case let .movieDetail(movieId):
            MovieDetailView(movieId: movieId)
        case let .seriesDetail(seriesId):
            SeriesDetailView(seriesId: seriesId)
        case let .actorDetail(actorName):
            ActorDetailView(actorName: actorName)
        case let .collectionDetail(collectionId):
            CollectionDetailView(collectionId: collectionId)
        case let .podcastDetail(showId):
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
        case .byocSources:
            BYOCSourceListView()
        case let .byocDetail(item):
            BYOCDetailView(item: item)
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
        case let .trivia(contentId):
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
        case .audiobookCollections:
            AudiobookCollectionsView()
        case let .audiobookAuthorDetail(author):
            AudiobookAuthorDetailView(author: author)
        case let .audiobookDetail(audiobookId):
            AudiobookDetailView(audiobookId: audiobookId)
        case .trending:
            TrendingView()
        case let .interactiveSubtitles(contentId):
            InteractiveSubtitlesView(contentId: contentId)
        case let .chapters(contentId):
            ChapterNavigationView(contentId: contentId)
        case .chatbot:
            ChatbotView(repository: repos.chat)
        case .avatarMode:
            AvatarModeView(stateMachine: AvatarStateMachine(), repository: repos.chat)
        case .betaCredits:
            CreditBalanceWidgetView()
        case let .subscriptionGate(contentId, requiredTier):
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
            OnboardingFlowView {}
        case .friends:
            FriendsView(repository: repos.friends)
        case .watchParty:
            WatchPartyView(repository: repos.watchParty)
        case .watchPartyDetail:
            WatchPartyView(repository: repos.watchParty)
        case let .chess(gameId):
            ChessView(gameId: gameId)
        case .directMessages:
            DirectMessagesView()
        case let .conversation(friendId):
            ConversationView(friendId: friendId)
        case .mfaSetup:
            MFASetupView()
        case .phoneVerification:
            PhoneVerificationView()
        case .zehAni:
            ZehAniHubView()
        case let .zehAniMagicMirror(profileId):
            MagicMirrorView(profileId: profileId)
        case let .zehAniV2V(avatarId, profileId):
            V2VPracticeView(avatarId: avatarId, profileId: profileId)
        case let .zehAniAvatar3D(avatarId):
            Avatar3DPreviewView(avatarImageUrl: avatarId)
        case let .zehAniHighlights(profileId):
            HighlightReelView(profileId: profileId)
        case let .zehAniContacts(profileId):
            ContactsManagementView(profileId: profileId)
        case let .zehAniFeedback(profileId):
            FeedbackInboxView(profileId: profileId)
        case let .zehAniAvatarSettings(profileId, avatarId):
            AvatarSettingsView(profileId: profileId, avatarId: avatarId)
        case let .zehAniMovieInteractions(profileId):
            MovieInteractionsView(profileId: profileId)
        case let .zehAniMovieCharacters(profileId, contentId):
            MovieCharactersView(profileId: profileId, contentId: contentId)
        case let .zehAniCharacterDialogue(profileId, contentId, characterName):
            CharacterDialogueView(profileId: profileId, contentId: contentId, characterName: characterName)
        case let .tvLogin(sessionId, token, expires):
            TVLoginView(sessionId: sessionId, token: token, expires: expires)
        default:
            ErrorStateView(
                message: "Screen not available",
                onRetry: { coordinator.pop() }
            )
        }
    }
}
