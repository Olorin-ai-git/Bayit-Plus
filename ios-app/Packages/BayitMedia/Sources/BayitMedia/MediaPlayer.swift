import AVFoundation
import BayitCore
import Combine
import Foundation
import Observation

/// Observable media player wrapping AVPlayer with state management.
///
/// Provides a clean Swift interface over AVPlayer with:
/// - @Observable state for SwiftUI binding
/// - Audio session management per content type
/// - Time observation for progress tracking
/// - Buffering and error state handling
@Observable
public final class MediaPlayer {

    // MARK: - Observable State

    public private(set) var state: PlaybackState = .idle
    public private(set) var currentTime: TimeInterval = 0
    public private(set) var duration: TimeInterval = 0
    public private(set) var bufferedTime: TimeInterval = 0
    public private(set) var isBuffering: Bool = false
    public private(set) var rate: Float = 0
    public private(set) var contentType: MediaContentType = .vod

    /// The underlying AVPlayer for UIKit/AVKit integration.
    public let avPlayer = AVPlayer()

    // MARK: - Private

    private let audioSession: AudioSessionService
    private let logger = BayitLogger(category: "MediaPlayer")
    private var timeObserver: Any?
    private var statusObservation: NSKeyValueObservation?
    private var timeControlObservation: NSKeyValueObservation?
    private var durationObservation: NSKeyValueObservation?
    private var loadedRangesObservation: NSKeyValueObservation?

    // MARK: - Init

    public init(audioSession: AudioSessionService = AudioSessionService()) {
        self.audioSession = audioSession
        setupObservers()
    }

    deinit {
        tearDownObservers()
    }

    // MARK: - Loading

    /// Load media from a URL and prepare for playback.
    public func load(url: URL, contentType: MediaContentType) {
        self.contentType = contentType
        state = .loading

        audioSession.configure(for: contentType)
        audioSession.activate()

        let asset = AVURLAsset(url: url)
        let item = AVPlayerItem(asset: asset)

        // Configure buffering for better seek performance
        item.preferredForwardBufferDuration = 30.0  // Preload 30 seconds
        item.canUseNetworkResourcesForLiveStreamingWhilePaused = true

        tearDownItemObservers()
        avPlayer.replaceCurrentItem(with: item)

        // Enable automatic waiting to minimize stalls
        avPlayer.automaticallyWaitsToMinimizeStalling = true

        setupItemObservers(for: item)

        logger.info(
            "Media loaded",
            context: [
                "contentType": contentType.rawValue,
                "url": url.lastPathComponent,
                "bufferDuration": "30s"
            ]
        )
    }

    // MARK: - Playback Controls

    /// Begin or resume playback.
    public func play() {
        guard state.canPlay || state == .playing else { return }
        avPlayer.play()
        state = .playing
    }

    /// Pause playback.
    public func pause() {
        avPlayer.pause()
        state = .paused
    }

    /// Toggle between play and pause.
    public func togglePlayPause() {
        if state == .playing {
            pause()
        } else {
            play()
        }
    }

    /// Seek to a specific time.
    public func seek(to time: TimeInterval) async {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        await avPlayer.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero)
        currentTime = time
    }

    /// Skip forward by a number of seconds.
    public func skipForward(seconds: TimeInterval = 10) async {
        let target = min(currentTime + seconds, duration)
        await seek(to: target)
    }

    /// Skip backward by a number of seconds.
    public func skipBackward(seconds: TimeInterval = 10) async {
        let target = max(currentTime - seconds, 0)
        await seek(to: target)
    }

    /// Set playback rate (1.0 = normal, 1.5 = 1.5x, etc.).
    public func setRate(_ newRate: Float) {
        avPlayer.rate = newRate
        rate = newRate
    }

    /// Stop playback and unload the current item.
    public func stop() {
        avPlayer.pause()
        avPlayer.replaceCurrentItem(with: nil)
        tearDownItemObservers()
        currentTime = 0
        duration = 0
        bufferedTime = 0
        state = .idle
        audioSession.deactivate()
    }

    /// Progress fraction (0.0 to 1.0).
    public var progress: Double {
        guard duration > 0 else { return 0 }
        return currentTime / duration
    }
}

// MARK: - Observers

extension MediaPlayer {

    private func setupObservers() {
        // Periodic time observer at ~4Hz for smooth progress updates
        let interval = CMTime(seconds: 0.25, preferredTimescale: 600)
        timeObserver = avPlayer.addPeriodicTimeObserver(
            forInterval: interval,
            queue: .main
        ) { [weak self] time in
            self?.currentTime = time.seconds
        }

        // Time control status (playing/paused/waiting)
        timeControlObservation = avPlayer.observe(
            \.timeControlStatus, options: [.new]
        ) { [weak self] player, _ in
            Task { @MainActor in
                self?.handleTimeControlChange(player.timeControlStatus)
            }
        }
    }

    private func setupItemObservers(for item: AVPlayerItem) {
        statusObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            Task { @MainActor in
                self?.handleStatusChange(item.status, item: item)
            }
        }

        durationObservation = item.observe(\.duration, options: [.new]) { [weak self] item, _ in
            Task { @MainActor in
                let seconds = item.duration.seconds
                if seconds.isFinite && seconds > 0 {
                    self?.duration = seconds
                }
            }
        }

        loadedRangesObservation = item.observe(
            \.loadedTimeRanges, options: [.new]
        ) { [weak self] item, _ in
            Task { @MainActor in
                self?.updateBufferedTime(from: item)
            }
        }
    }

    private func tearDownItemObservers() {
        statusObservation?.invalidate()
        statusObservation = nil
        durationObservation?.invalidate()
        durationObservation = nil
        loadedRangesObservation?.invalidate()
        loadedRangesObservation = nil
    }

    private func tearDownObservers() {
        if let observer = timeObserver {
            avPlayer.removeTimeObserver(observer)
            timeObserver = nil
        }
        timeControlObservation?.invalidate()
        timeControlObservation = nil
        tearDownItemObservers()
    }

    @MainActor
    private func handleStatusChange(_ status: AVPlayerItem.Status, item: AVPlayerItem) {
        switch status {
        case .readyToPlay:
            let seconds = item.duration.seconds
            if seconds.isFinite && seconds > 0 {
                duration = seconds
            }
            if state == .loading {
                state = .ready
            }
        case .failed:
            let message = item.error?.localizedDescription ?? "Unknown playback error"
            state = .failed(message)
            logger.error("Player item failed", context: ["reason": message])
        case .unknown:
            break
        @unknown default:
            break
        }
    }

    @MainActor
    private func handleTimeControlChange(_ status: AVPlayer.TimeControlStatus) {
        switch status {
        case .playing:
            isBuffering = false
            state = .playing
            rate = avPlayer.rate
        case .paused:
            isBuffering = false
            rate = 0
            if state == .playing {
                state = .paused
            }
        case .waitingToPlayAtSpecifiedRate:
            isBuffering = true
            if state == .playing {
                state = .buffering
            }
        @unknown default:
            break
        }
    }

    @MainActor
    private func updateBufferedTime(from item: AVPlayerItem) {
        guard let range = item.loadedTimeRanges.first?.timeRangeValue else { return }
        bufferedTime = range.start.seconds + range.duration.seconds
    }
}
