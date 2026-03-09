import BayitCore
import BayitNetworking
import Foundation
import Observation

/// Provides repository instances for the tvOS app via SwiftUI Environment.
///
/// Mirrors the iOS RepositoryProvider but excludes iOS-only features
/// (voice orchestration, downloads, device pairing).
/// Shares all repository protocols and implementations from BayitPlusApp.
@Observable
final class TVRepositoryProvider {
    let actor: any ActorRepository
    let content: any ContentRepository
    let liveTV: any LiveTVRepository
    let radio: any RadioRepository
    let series: any SeriesRepository
    let media: any MediaRepository
    let playlist: any PlaylistRepository
    let epg: any EPGRepository
    let category: any CategoryRepository
    let settings: any SettingsRepository
    let userSettings: any UserSettingsRepository
    let liveDubbing: any LiveDubbingRepository
    let subtitle: any SubtitleRepository
    let chapter: any ChapterRepository
    let audiobook: any AudiobookRepository
    let trendingRepo: any TrendingRepository
    let llmSearch: any LLMSearchRepository
    let podcasts: any PodcastRepository
    let user: any UserRepository
    let betaCredits: any BetaCreditsRepository
    let culture: any CultureRepository
    let trivia: any TriviaRepository
    let friends: any FriendsRepository
    let reward: any RewardRepository
    let search: any SearchRepository
    let watchParty: any WatchPartyRepository
    let household: any HouseholdRepository
    let news: any NewsRepository
    let stats: any StatsRepository
    let shabbat: any ShabbatRepository
    let security: any SecurityRepository
    let familyControls: any FamilyControlsRepository
    let chat: any ChatRepository
    let chess: any ChessRepository
    let directMessages: any DirectMessageRepository
    let widget: any WidgetRepository
    let missions: any MissionsRepository
    let starStory: any StarStoryRepository
    let grandparentBridgeRepository: any GrandparentBridgeRepository
    let gamificationRepository: any GamificationRepository
    let avatarMeshRepository: any AvatarRepository
    let phoneticMirrorRepository: any PhoneticMirrorRepository
    let zehAniRepository: any ZehAniRepository
    let movieInteraction: any MovieInteractionRepository
    let avatarOutfitRepository: any AvatarOutfitRepository
    let webSocketManager: WebSocketManager
    let authTokenProvider: AuthTokenProvider
    let configuration: any EnvironmentConfiguration
    let offlineCache: OfflineCacheService
    let apiClient: APIClient

    init(
        client: APIClient,
        webSocketManager: WebSocketManager,
        authTokenProvider: AuthTokenProvider,
        configuration: any EnvironmentConfiguration
    ) {
        apiClient = client
        actor = APIActorRepository(client: client)
        content = APIContentRepository(client: client)
        liveTV = APILiveTVRepository(client: client)
        radio = APIRadioRepository(client: client)
        series = APISeriesRepository(client: client)
        media = APIMediaRepository(client: client)
        playlist = APIPlaylistRepository(client: client)
        epg = APIEPGRepository(client: client)
        category = APICategoryRepository(client: client)
        settings = APISettingsRepository(client: client)
        userSettings = APIUserSettingsRepository(client: client)
        liveDubbing = APILiveDubbingRepository(client: client)
        subtitle = APISubtitleRepository(client: client)
        chapter = APIChapterRepository(client: client)
        audiobook = APIAudiobookRepository(client: client)
        trendingRepo = APITrendingRepository(client: client)
        llmSearch = APILLMSearchRepository(client: client)
        podcasts = APIPodcastRepository(client: client)
        user = APIUserRepository(client: client)
        betaCredits = APIBetaCreditsRepository(client: client)
        culture = APICultureRepository(client: client)
        trivia = APITriviaRepository(client: client)
        friends = APIFriendsRepository(client: client)
        reward = APIRewardRepository(client: client)
        search = APISearchRepository(client: client)
        watchParty = APIWatchPartyRepository(client: client)
        household = APIHouseholdRepository(client: client)
        news = APINewsRepository(client: client)
        stats = APIStatsRepository(client: client)
        shabbat = APIShabbatRepository(client: client)
        security = APISecurityRepository(client: client)
        familyControls = APIFamilyControlsRepository(client: client)
        chat = APIChatRepository(client: client)
        chess = APIChessRepository(client: client, webSocketManager: webSocketManager)
        directMessages = APIDirectMessageRepository(client: client, webSocketManager: webSocketManager)
        widget = APIWidgetRepository(client: client)
        missions = APIMissionsRepository(client: client)
        starStory = APIStarStoryRepository(client: client)
        grandparentBridgeRepository = APIGrandparentBridgeRepository(client: client)
        gamificationRepository = APIGamificationRepository(client: client)
        avatarMeshRepository = APIAvatarRepository(client: client)
        phoneticMirrorRepository = APIPhoneticMirrorRepository(client: client)
        zehAniRepository = APIZehAniRepository(client: client)
        movieInteraction = APIMovieInteractionRepository(client: client)
        avatarOutfitRepository = APIAvatarOutfitRepository(client: client)
        self.webSocketManager = webSocketManager
        self.authTokenProvider = authTokenProvider
        self.configuration = configuration
        offlineCache = OfflineCacheService()
    }
}
