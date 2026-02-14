import BayitMedia
import Foundation

/// Tracks playback progress and periodically saves to backend.
/// Handles resume position management for VOD content.
@MainActor
final class ProgressTracker {

    private let repository: any MediaRepository
    private let player: MediaPlayer
    private let contentId: String
    private let contentType: ContentType
    private let intervalSeconds: TimeInterval

    private var trackingTask: Task<Void, Never>?
    private(set) var initialPosition: TimeInterval = 0

    init(
        repository: any MediaRepository,
        player: MediaPlayer,
        contentId: String,
        contentType: ContentType,
        intervalSeconds: TimeInterval = 15
    ) {
        self.repository = repository
        self.player = player
        self.contentId = contentId
        self.contentType = contentType
        self.intervalSeconds = intervalSeconds
    }

    /// Load resume position from watch history.
    func loadResumePosition() async {
        do {
            let history = try await repository.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == contentId }) {
                initialPosition = item.position ?? 0
            }
        } catch {
            // Resume position is optional - continue without it
            initialPosition = 0
        }
    }

    /// Start periodic progress tracking.
    /// Saves progress every N seconds as configured.
    func startTracking() {
        // Cancel any existing tracking task
        trackingTask?.cancel()
        trackingTask = nil

        trackingTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let interval = self?.intervalSeconds else { break }
                try? await Task.sleep(for: .seconds(interval))
                guard !Task.isCancelled else { break }
                await self?.saveProgress()
            }
        }
    }

    /// Stop progress tracking and save final position.
    func stopTracking() async {
        trackingTask?.cancel()
        trackingTask = nil
        await saveProgress()
    }

    /// Save current progress to backend.
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
            // Progress save failures are non-critical - continue playback
        }
    }
}
