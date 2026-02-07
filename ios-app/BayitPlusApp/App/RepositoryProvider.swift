import BayitNetworking
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

    init(client: APIClient) {
        self.content = APIContentRepository(client: client)
        self.liveTV = APILiveTVRepository(client: client)
        self.radio = APIRadioRepository(client: client)
        self.podcasts = APIPodcastRepository(client: client)
        self.series = APISeriesRepository(client: client)
    }
}
