import BayitCore
import BayitMedia
import Combine
import Foundation

/// Bridges MediaPlayer with CastSessionManager to sync playback state.
@MainActor
public final class MediaPlayerCastBridge: ObservableObject {

    private let mediaPlayer: MediaPlayer
    private let castManager: CastSessionManager
    private let logger = BayitLogger(category: "MediaPlayerCastBridge")

    private var cancellables = Set<AnyCancellable>()
    private var lastSyncTime: TimeInterval = 0
    private let syncThreshold: TimeInterval = 1.0

    @Published public private(set) var isCasting: Bool = false

    public init(
        mediaPlayer: MediaPlayer,
        castManager: CastSessionManager
    ) {
        self.mediaPlayer = mediaPlayer
        self.castManager = castManager
        setupObservers()
    }

    private func setupObservers() {
        castManager.statePublisher
            .sink { [weak self] state in
                self?.handleCastStateChange(state)
            }
            .store(in: &cancellables)

        Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                Task { @MainActor in
                    await self?.syncPlaybackState()
                }
            }
            .store(in: &cancellables)
    }

    private func handleCastStateChange(_ state: CastSessionState) {
        isCasting = state.isConnected

        logger.info("Cast state changed", context: [
            "newState": state.rawValue,
            "isCasting": "\(isCasting)"
        ])

        if state.isConnected {
            Task {
                await loadCurrentMedia()
            }
        }
    }

    private func loadCurrentMedia() async {
        guard let currentItem = mediaPlayer.avPlayer.currentItem,
              let url = (currentItem.asset as? AVURLAsset)?.url else {
            logger.warning("Cannot load media to cast - no current item")
            return
        }

        let media = CastMedia(
            contentId: UUID().uuidString,
            title: "Bayit+ Content",
            streamUrl: url,
            posterUrl: nil,
            duration: mediaPlayer.duration > 0 ? mediaPlayer.duration : nil
        )

        do {
            try await castManager.loadMedia(media)
            await syncPlaybackState()
            logger.info("Current media loaded to cast device")
        } catch {
            logger.error("Failed to load current media to cast device", error: error)
        }
    }

    public func syncPlaybackState() async {
        guard isCasting else { return }

        let currentTime = mediaPlayer.currentTime
        let timeDiff = abs(currentTime - lastSyncTime)

        guard timeDiff >= syncThreshold else {
            return
        }

        let playbackState = CastPlaybackState(
            currentTime: currentTime,
            isPlaying: mediaPlayer.state == .playing,
            volume: 1.0
        )

        do {
            try await castManager.syncPlaybackState(playbackState)
            lastSyncTime = currentTime
        } catch {
            logger.error("Failed to sync playback state to cast", error: error)
        }
    }

    public func loadMedia(_ media: CastMedia) async throws {
        guard isCasting else {
            throw CastError.notConnected
        }

        try await castManager.loadMedia(media)
        logger.info("Media loaded to cast device via bridge", context: [
            "contentId": media.contentId
        ])
    }
}
