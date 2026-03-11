import BayitCore
import BayitNetworking
import BayitVoice
import Foundation
import StoreKit

/// Provides all repository instances for dependency injection via SwiftUI Environment.
/// Initialized once in BayitPlusApp with the shared APIClient.
@Observable
final class RepositoryProvider {
    let actor: any ActorRepository
    let content: any ContentRepository
    let liveTV: any LiveTVRepository
    let radio: any RadioRepository
    let podcasts: any PodcastRepository
    let series: any SeriesRepository
    let media: any MediaRepository
    let user: any UserRepository
    let playlist: any PlaylistRepository
    let epg: any EPGRepository
    let category: any CategoryRepository
    let voice: any VoiceRepository
    let settings: any SettingsRepository
    let userSettings: any UserSettingsRepository
    let trivia: any TriviaRepository
    let chat: any ChatRepository
    let liveDubbing: any LiveDubbingRepository
    let culture: any CultureRepository
    let shabbat: any ShabbatRepository
    let familyControls: any FamilyControlsRepository
    let securitySettings: any SecurityRepository
    let betaCredits: any BetaCreditsRepository
    let subtitle: any SubtitleRepository
    let chapter: any ChapterRepository
    let audiobook: any AudiobookRepository
    let trendingRepo: any TrendingRepository
    let llmSearch: any LLMSearchRepository
    let household: any HouseholdRepository
    let reward: any RewardRepository
    let devicePairing: any DevicePairingRepository
    let widget: any WidgetRepository
    let friends: any FriendsRepository
    let watchParty: any WatchPartyRepository
    let chess: any ChessRepository
    let directMessages: any DirectMessageRepository
    let stats: any StatsRepository
    let news: any NewsRepository
    let search: any SearchRepository
    let missions: any MissionsRepository
    let starStory: any StarStoryRepository
    let interactiveMissionRepository: any InteractiveMissionRepository
    let avatarRepository: any AvatarOutfitRepository
    let familySnapRepository: any FamilySnapRepository
    let phoneticMirrorRepository: any PhoneticMirrorRepository
    let grandparentBridgeRepository: any GrandparentBridgeRepository
    let gamificationRepository: any GamificationRepository
    let avatarMeshRepository: any AvatarRepository
    let talkBack: any TalkBackRepository
    let zehAniRepository: any ZehAniRepository
    let movieInteraction: any MovieInteractionRepository
    let tvLogin: any TVLoginRepository
    let discover: any DiscoverRepository
    let proactiveSuggestion: any ProactiveSuggestionRepository
    let webSocketManager: WebSocketManager
    let authTokenProvider: AuthTokenProvider
    let configuration: any EnvironmentConfiguration
    let offlineCache: OfflineCacheService
    let storeManager: StoreManager
    let apiClient: APIClient

    init(client: APIClient, webSocketManager: WebSocketManager, authTokenProvider: AuthTokenProvider, configuration: any EnvironmentConfiguration) {
        apiClient = client
        actor = APIActorRepository(client: client)
        content = APIContentRepository(client: client)
        liveTV = APILiveTVRepository(client: client)
        radio = APIRadioRepository(client: client)
        podcasts = APIPodcastRepository(client: client)
        series = APISeriesRepository(client: client)
        media = APIMediaRepository(client: client)
        user = APIUserRepository(client: client)
        playlist = APIPlaylistRepository(client: client)
        epg = APIEPGRepository(client: client)
        category = APICategoryRepository(client: client)
        voice = APIVoiceRepository(client: client)
        settings = APISettingsRepository(client: client)
        userSettings = APIUserSettingsRepository(client: client)
        trivia = APITriviaRepository(client: client)
        chat = APIChatRepository(client: client)
        liveDubbing = APILiveDubbingRepository(client: client)
        culture = APICultureRepository(client: client)
        shabbat = APIShabbatRepository(client: client)
        familyControls = APIFamilyControlsRepository(client: client)
        securitySettings = APISecurityRepository(client: client)
        betaCredits = APIBetaCreditsRepository(client: client)
        subtitle = APISubtitleRepository(client: client)
        chapter = APIChapterRepository(client: client)
        audiobook = APIAudiobookRepository(client: client)
        trendingRepo = APITrendingRepository(client: client)
        llmSearch = APILLMSearchRepository(client: client)
        household = APIHouseholdRepository(client: client)
        reward = APIRewardRepository(client: client)
        devicePairing = APIDevicePairingRepository(client: client)
        widget = APIWidgetRepository(client: client)
        friends = APIFriendsRepository(client: client)
        watchParty = APIWatchPartyRepository(client: client)
        chess = APIChessRepository(client: client, webSocketManager: webSocketManager)
        directMessages = APIDirectMessageRepository(client: client, webSocketManager: webSocketManager)
        stats = APIStatsRepository(client: client)
        news = APINewsRepository(client: client)
        search = APISearchRepository(client: client)
        missions = APIMissionsRepository(client: client)
        starStory = APIStarStoryRepository(client: client)
        interactiveMissionRepository = APIInteractiveMissionRepository(client: client)
        avatarRepository = APIAvatarOutfitRepository(client: client)
        familySnapRepository = APIFamilySnapRepository(client: client)
        phoneticMirrorRepository = APIPhoneticMirrorRepository(client: client)
        grandparentBridgeRepository = APIGrandparentBridgeRepository(client: client)
        gamificationRepository = APIGamificationRepository(client: client)
        avatarMeshRepository = APIAvatarRepository(client: client)
        talkBack = APITalkBackRepository(client: client)
        zehAniRepository = APIZehAniRepository(client: client)
        movieInteraction = APIMovieInteractionRepository(client: client)
        tvLogin = APITVLoginRepository(client: client)
        discover = APIDiscoverRepository(client: client)
        proactiveSuggestion = APIProactiveSuggestionRepository(client: client)
        self.webSocketManager = webSocketManager
        self.authTokenProvider = authTokenProvider
        self.configuration = configuration
        offlineCache = OfflineCacheService()
        storeManager = StoreManager(config: configuration, apiClient: client)
    }
}
