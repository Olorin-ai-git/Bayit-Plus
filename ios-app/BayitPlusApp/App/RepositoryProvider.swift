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

    init(client: APIClient) {
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
    }
}
