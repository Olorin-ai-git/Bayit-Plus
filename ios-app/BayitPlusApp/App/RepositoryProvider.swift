import BayitCore
import BayitNetworking
import BayitVoice
import Foundation
import Observation

/// Provides all repository instances for dependency injection via SwiftUI Environment.
/// Initialized once in BayitPlusApp with the shared APIClient.
@Observable
final class RepositoryProvider {
    let content: any ContentRepository
    let liveTV: any LiveTVRepository
    let radio: any RadioRepository
    let podcasts: any PodcastRepository
    let series: any SeriesRepository
    let media: any MediaRepository
    let user: any UserRepository
    let epg: any EPGRepository
    let category: any CategoryRepository
    let voice: any VoiceRepository
    let settings: any SettingsRepository
    let trivia: any TriviaRepository
    let chat: any ChatRepository
    let liveDubbing: any LiveDubbingRepository
    let culture: any CultureRepository
    let shabbat: any ShabbatRepository
    let familyControls: any FamilyControlsRepository
    let securitySettings: any SecurityRepository
    let passkey: any PasskeyRepository
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
    let avatarMeshRepository: any AvatarMeshRepository
    let zehAniRepository: any ZehAniRepository
    let authTokenProvider: AuthTokenProvider
    let configuration: any EnvironmentConfiguration
    let offlineCache: OfflineCacheService

    init(client: APIClient, webSocketManager: WebSocketManager, authTokenProvider: AuthTokenProvider, configuration: any EnvironmentConfiguration) {
        self.content = APIContentRepository(client: client)
        self.liveTV = APILiveTVRepository(client: client)
        self.radio = APIRadioRepository(client: client)
        self.podcasts = APIPodcastRepository(client: client)
        self.series = APISeriesRepository(client: client)
        self.media = APIMediaRepository(client: client)
        self.user = APIUserRepository(client: client)
        self.epg = APIEPGRepository(client: client)
        self.category = APICategoryRepository(client: client)
        self.voice = APIVoiceRepository(client: client)
        self.settings = APISettingsRepository(client: client)
        self.trivia = APITriviaRepository(client: client)
        self.chat = APIChatRepository(client: client)
        self.liveDubbing = APILiveDubbingRepository(client: client)
        self.culture = APICultureRepository(client: client)
        self.shabbat = APIShabbatRepository(client: client)
        self.familyControls = APIFamilyControlsRepository(client: client)
        self.securitySettings = APISecurityRepository(client: client)
        self.passkey = APIPasskeyRepository(client: client)
        self.betaCredits = APIBetaCreditsRepository(client: client)
        self.subtitle = APISubtitleRepository(client: client)
        self.chapter = APIChapterRepository(client: client)
        self.audiobook = APIAudiobookRepository(client: client)
        self.trendingRepo = APITrendingRepository(client: client)
        self.llmSearch = APILLMSearchRepository(client: client)
        self.household = APIHouseholdRepository(client: client)
        self.reward = APIRewardRepository(client: client)
        self.devicePairing = APIDevicePairingRepository(client: client)
        self.widget = APIWidgetRepository(client: client)
        self.friends = APIFriendsRepository(client: client)
        self.watchParty = APIWatchPartyRepository(client: client)
        self.chess = APIChessRepository(client: client, webSocketManager: webSocketManager)
        self.directMessages = APIDirectMessageRepository(client: client, webSocketManager: webSocketManager)
        self.stats = APIStatsRepository(client: client)
        self.news = APINewsRepository(client: client)
        self.search = APISearchRepository(client: client)
        self.missions = APIMissionsRepository(client: client)
        self.starStory = APIStarStoryRepository(client: client)
        self.interactiveMissionRepository = APIInteractiveMissionRepository(client: client)
        self.avatarRepository = APIAvatarOutfitRepository(client: client)
        self.familySnapRepository = APIFamilySnapRepository(client: client)
        self.phoneticMirrorRepository = APIPhoneticMirrorRepository(client: client)
        self.grandparentBridgeRepository = APIGrandparentBridgeRepository(client: client)
        self.gamificationRepository = APIGamificationRepository(client: client)
        self.avatarMeshRepository = APIAvatarMeshRepository(client: client)
        self.zehAniRepository = APIZehAniRepository(client: client)
        self.authTokenProvider = authTokenProvider
        self.configuration = configuration
        self.offlineCache = OfflineCacheService()
    }
}
