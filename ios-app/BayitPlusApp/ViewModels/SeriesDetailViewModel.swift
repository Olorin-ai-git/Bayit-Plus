import Foundation
import Observation

/// ViewModel for the Series Detail screen - manages series detail with season/episode picker
@MainActor
@Observable
final class SeriesDetailViewModel {
    private(set) var detail: SeriesDetail?
    private(set) var episodes: [EpisodeItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingEpisodes = false
    private(set) var error: String?
    private(set) var episodeProgress: [String: Double] = [:]
    private(set) var isFavorite = false
    private(set) var isFavoriteLoading = false

    var selectedSeason: Int = 1

    private let seriesRepository: any SeriesRepository
    private let mediaRepository: any MediaRepository
    private let userRepository: any UserRepository
    let seriesId: String

    init(
        seriesId: String,
        repository: any SeriesRepository,
        mediaRepository: any MediaRepository,
        userRepository: any UserRepository
    ) {
        self.seriesId = seriesId
        seriesRepository = repository
        self.mediaRepository = mediaRepository
        self.userRepository = userRepository
    }

    @MainActor
    func loadDetail() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let detailTask = seriesRepository.fetchSeriesDetail(id: seriesId)
            async let progressTask: Void = loadWatchProgress()
            async let favoriteTask: Void = loadFavoriteStatus()
            detail = try await detailTask
            await progressTask
            await favoriteTask
            if let firstSeason = detail?.seasons?.first {
                selectedSeason = firstSeason.seasonNumber
                await loadEpisodes(season: firstSeason.seasonNumber)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoadingEpisodes = false
    }

    /// Returns watch progress (0.0-1.0) for a given episode ID
    func progress(for episodeId: String) -> Double? {
        episodeProgress[episodeId]
    }

    @MainActor
    private func loadWatchProgress() async {
        do {
            let response = try await mediaRepository.fetchContinueWatching()
            var progressMap: [String: Double] = [:]
            for item in response.items {
                if let progress = item.progress {
                    progressMap[item.id] = progress / 100.0
                }
            }
            episodeProgress = progressMap
        } catch {
            // Silently fail - progress is optional
        }
    }

    @MainActor
    func toggleFavorite() async {
        isFavoriteLoading = true
        let previousState = isFavorite
        isFavorite.toggle()

        do {
            let response = try await userRepository.toggleFavorite(
                request: FavoriteToggleRequest(contentId: seriesId, contentType: "series")
            )
            isFavorite = response.isFavorite ?? !previousState
        } catch {
            isFavorite = previousState
        }

        isFavoriteLoading = false
    }

    @MainActor
    private func loadFavoriteStatus() async {
        do {
            let response = try await userRepository.checkFavorite(contentId: seriesId)
            isFavorite = response.isFavorite ?? false
        } catch {
            // Silently fail - favorites check is non-critical
        }
    }

    var seasons: [SeasonSummary] {
        detail?.seasons ?? []
    }

    var relatedItems: [RelatedItem] {
        detail?.related ?? []
    }

    var hasTrailer: Bool {
        detail?.trailerUrl != nil || detail?.trailerStreamUrl != nil
    }
}
