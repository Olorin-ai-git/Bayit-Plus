import Foundation
import Observation

/// ViewModel for the Series Detail screen - manages series detail with season/episode picker
@Observable
final class SeriesDetailViewModel {
    private(set) var detail: SeriesDetail?
    private(set) var episodes: [EpisodeItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingEpisodes = false
    private(set) var error: String?

    var selectedSeason: Int = 1

    private let seriesRepository: any SeriesRepository
    let seriesId: String

    init(seriesId: String, repository: any SeriesRepository) {
        self.seriesId = seriesId
        self.seriesRepository = repository
    }

    @MainActor
    func loadDetail() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            detail = try await seriesRepository.fetchSeriesDetail(id: seriesId)
            if let firstSeason = detail?.seasons?.first {
                selectedSeason = firstSeason.seasonNumber
                await loadEpisodes(season: firstSeason.seasonNumber)
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadEpisodes(season: Int) async {
        isLoadingEpisodes = true
        selectedSeason = season

        do {
            let response = try await seriesRepository.fetchSeasonEpisodes(
                seriesId: seriesId,
                seasonNumber: season
            )
            episodes = response.episodes
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingEpisodes = false
    }

    var seasons: [SeasonSummary] {
        detail?.seasons ?? []
    }

    var relatedItems: [RelatedItem] {
        detail?.related ?? []
    }

    var hasTrailer: Bool {
        detail?.trailerUrl != nil
    }
}
