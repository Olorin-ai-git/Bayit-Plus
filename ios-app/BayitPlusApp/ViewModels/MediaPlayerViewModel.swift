import BayitMedia
import Foundation
import Observation

/// ViewModel coordinating media playback, stream loading, and watch history.
///
/// Bridges the app's repository layer with BayitMedia's MediaPlayer,
/// handling stream URL resolution, progress tracking, and content-specific behavior.
@Observable
final class MediaPlayerViewModel {

    // MARK: - Observable State

    private(set) var isLoading = true
    private(set) var errorMessage: String?
    private(set) var title: String?
    private(set) var subtitle: String?
    private(set) var artworkURL: URL?
    private(set) var initialPosition: TimeInterval = 0
    private(set) var availableQualities: [QualityVariant] = []
    private(set) var currentQuality: String?

    let player: MediaPlayer
    let contentId: String
    let contentType: ContentType

    // MARK: - Private

    private let repository: any MediaRepository
    private let contentRepository: any ContentRepository
    private var progressTrackingTask: Task<Void, Never>?
    private let progressIntervalSeconds: TimeInterval = 15

    // MARK: - Init

    init(
        contentId: String,
        contentType: ContentType,
        player: MediaPlayer,
        repository: any MediaRepository,
        contentRepository: any ContentRepository
    ) {
        self.contentId = contentId
        self.contentType = contentType
        self.player = player
        self.repository = repository
        self.contentRepository = contentRepository
    }

    deinit {
        progressTrackingTask?.cancel()
    }

    // MARK: - Loading

    /// Load content metadata and stream URL, then begin playback.
    @MainActor
    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load content detail for metadata
            let detail = try await contentRepository.fetchContentDetail(id: contentId)
            title = detail.title
            subtitle = detail.category
            if let backdropStr = detail.backdrop, let url = URL(string: backdropStr) {
                artworkURL = url
            }

            // Load stream URL based on content type
            let streamURL = try await resolveStreamURL(detail: detail)
            guard let url = URL(string: streamURL) else {
                errorMessage = "Invalid stream URL"
                isLoading = false
                return
            }

            let mediaType = mapContentType(contentType)
            player.load(url: url, contentType: mediaType)

            // Fetch resume position from watch history
            await loadResumePosition()

            isLoading = false

            // Auto-play after loading
            player.play()

            // Seek to resume position if available
            if initialPosition > 0 {
                await player.seek(to: initialPosition)
            }

            // Start periodic progress tracking for non-live content
            if mediaType.isSeekable {
                startProgressTracking()
            }
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: - Quality

    /// Switch stream quality.
    @MainActor
    func switchQuality(_ quality: String) async {
        guard quality != currentQuality else { return }
        let currentPos = player.currentTime
        currentQuality = quality

        do {
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: quality
            )
            guard let urlStr = stream.url, let url = URL(string: urlStr) else { return }

            let mediaType = mapContentType(contentType)
            player.load(url: url, contentType: mediaType)
            player.play()
            await player.seek(to: currentPos)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Cleanup

    /// Stop playback and save final progress.
    @MainActor
    func cleanup() async {
        progressTrackingTask?.cancel()
        progressTrackingTask = nil
        await saveProgress()
        player.stop()
    }

    // MARK: - Private

    private func resolveStreamURL(detail: ContentDetail) async throws -> String {
        switch contentType {
        case .live, .liveTV:
            let stream = try await repository.fetchLiveStream(channelId: contentId)
            currentQuality = stream.quality
            availableQualities = stream.availableQualities ?? []
            return stream.url ?? detail.streamUrl ?? ""

        case .radio:
            let stream = try await repository.fetchRadioStream(stationId: contentId)
            return stream.url ?? ""

        case .movie, .series, .episode, .podcast, .audiobook:
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: nil
            )
            currentQuality = stream.quality
            availableQualities = stream.availableQualities ?? []
            return stream.url ?? detail.streamUrl ?? ""
        }
    }

    @MainActor
    private func loadResumePosition() async {
        do {
            let history = try await repository.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == contentId }) {
                initialPosition = item.position ?? 0
            }
        } catch {
            // Resume position is optional - continue without it
        }
    }

    private func startProgressTracking() {
        progressTrackingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(self?.progressIntervalSeconds ?? 15))
                guard !Task.isCancelled else { break }
                await self?.saveProgress()
            }
        }
    }

    @MainActor
    private func saveProgress() async {
        guard player.currentTime > 0, player.duration > 0 else { return }

        let request = WatchProgressRequest(
            contentId: contentId,
            contentType: contentType.rawValue,
            position: player.currentTime,
            duration: player.duration
        )

        do {
            _ = try await repository.updateProgress(request: request)
        } catch {
            // Progress save failures are non-critical
        }
    }

    private func mapContentType(_ type: ContentType) -> MediaContentType {
        switch type {
        case .live, .liveTV: return .liveTV
        case .movie, .series, .episode: return .vod
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        }
    }
}
