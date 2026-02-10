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
    let content: any ContentRepository
    let liveTV: any LiveTVRepository
    let radio: any RadioRepository
    let series: any SeriesRepository
    let media: any MediaRepository
    let epg: any EPGRepository
    let category: any CategoryRepository
    let settings: any SettingsRepository
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
    let security: any SecurityRepository
    let directMessages: any DirectMessageRepository
    let authTokenProvider: AuthTokenProvider
    let configuration: any EnvironmentConfiguration
    let offlineCache: OfflineCacheService

    init(
        client: APIClient,
        webSocketManager: WebSocketManager,
        authTokenProvider: AuthTokenProvider,
        configuration: any EnvironmentConfiguration
    ) {
        self.content = APIContentRepository(client: client)
        self.liveTV = APILiveTVRepository(client: client)
        self.radio = APIRadioRepository(client: client)
        self.series = APISeriesRepository(client: client)
        self.media = APIMediaRepository(client: client)
        self.epg = APIEPGRepository(client: client)
        self.category = APICategoryRepository(client: client)
        self.settings = APISettingsRepository(client: client)
        self.liveDubbing = APILiveDubbingRepository(client: client)
        self.subtitle = APISubtitleRepository(client: client)
        self.chapter = APIChapterRepository(client: client)
        self.audiobook = APIAudiobookRepository(client: client)
        self.trendingRepo = APITrendingRepository(client: client)
        self.llmSearch = APILLMSearchRepository(client: client)
        self.podcasts = APIPodcastRepository(client: client)
        self.user = APIUserRepository(client: client)
        self.betaCredits = APIBetaCreditsRepository(client: client)
        self.culture = APICultureRepository(client: client)
        self.trivia = APITriviaRepository(client: client)
        self.friends = APIFriendsRepository(client: client)
        self.reward = APIRewardRepository(client: client)
        self.search = APISearchRepository(client: client)
        self.watchParty = APIWatchPartyRepository(client: client)
        self.household = APIHouseholdRepository(client: client)
        self.news = APINewsRepository(client: client)
        self.stats = APIStatsRepository(client: client)
        self.security = APISecurityRepository(client: client)
        self.directMessages = APIDirectMessageRepository(client: client, webSocketManager: webSocketManager)
        self.authTokenProvider = authTokenProvider
        self.configuration = configuration
        self.offlineCache = OfflineCacheService()
    }
}
