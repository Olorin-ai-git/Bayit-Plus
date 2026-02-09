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
    let authTokenProvider: AuthTokenProvider

    init(
        client: APIClient,
        webSocketManager: WebSocketManager,
        authTokenProvider: AuthTokenProvider
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
        self.authTokenProvider = authTokenProvider
    }
}
