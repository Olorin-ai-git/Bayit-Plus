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
    private var seekableRangesObservation: NSKeyValueObservation?

    /// Set once the asset reports a finite duration via its own property
    /// or via AVPlayerItem.duration. Prevents seekableTimeRanges (which
    /// grow incrementally as HLS segments arrive) from overriding the
    /// authoritative value with a smaller, partial one.
    private var hasDefinitiveDuration = false

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
        hasDefinitiveDuration = false

        audioSession.configure(for: contentType)
        audioSession.activate()

        let asset = AVURLAsset(url: url)
        // Pre-load duration and playable keys so the full HLS manifest
        // is parsed before the item reports readyToPlay. Without this,
        // AVPlayerItem can become ready after only a partial manifest
        // parse, causing the duration to show a fraction of the real length.
        let item = AVPlayerItem(
            asset: asset,
            automaticallyLoadedAssetKeys: ["duration", "playable"]
        )

        // Live streams cap forward buffer at 30s to stay near the live edge.
        // VOD caps at 60s so stall recovery only needs to refill a bounded
        // window instead of the unbounded default, which on high-bitrate
        // tvOS streams (4K) can take minutes to fill after a network dip.
        item.preferredForwardBufferDuration = contentType.isLive ? 30.0 : 60.0
        item.canUseNetworkResourcesForLiveStreamingWhilePaused = true

        // Start playback from the lowest eligible variant and ramp up.
        // Without this AVPlayer estimates bandwidth and may pick a 4K
        // variant that exceeds actual throughput, causing multi-minute
        // buffering on tvOS before the first frame appears.
        item.startsOnFirstEligibleVariant = true

        tearDownItemObservers()
        avPlayer.replaceCurrentItem(with: item)

        // Enable automatic waiting to minimize stalls
        avPlayer.automaticallyWaitsToMinimizeStalling = true

        setupItemObservers(for: item)

        // Asynchronously load the asset duration as a fallback. For HLS
        // VOD the manifest may not be fully parsed when the item becomes
        // ready; loading the asset property directly forces a complete
        // parse and gives us the authoritative total duration.
        Task { @MainActor [weak self] in
            await self?.loadAssetDuration(asset)
        }

        logger.info(
            "Media loaded",
            context: [
                "contentType": contentType.rawValue,
                "url": url.lastPathComponent,
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
    ///
    /// Uses a 2-second tolerance window so AVFoundation can land on the nearest
    /// keyframe within HLS/DASH segments. Zero-tolerance seeks on segment-based
    /// streams fail silently when no keyframe exists at the exact target time,
    /// causing both skip buttons and scrubbing to appear broken.
    public func seek(to time: TimeInterval) async {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        let tolerance = CMTime(seconds: 2, preferredTimescale: 600)
        await avPlayer.seek(to: cmTime, toleranceBefore: tolerance, toleranceAfter: tolerance)
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
        hasDefinitiveDuration = false
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
                if seconds.isFinite, seconds > 0 {
                    self?.duration = seconds
                    self?.hasDefinitiveDuration = true
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

        // HLS streams may report AVPlayerItem.duration as indefinite
        // until the full manifest loads. Observe seekableTimeRanges
        // which provides the actual content extent as segments arrive.
        seekableRangesObservation = item.observe(
            \.seekableTimeRanges, options: [.new]
        ) { [weak self] item, _ in
            Task { @MainActor in
                self?.updateDurationFromSeekableRanges(item)
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
        seekableRangesObservation?.invalidate()
        seekableRangesObservation = nil
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
            if seconds.isFinite, seconds > 0 {
                duration = seconds
                hasDefinitiveDuration = true
            } else {
                // HLS fallback: derive from seekable ranges
                updateDurationFromSeekableRanges(item)
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
        // Use the loaded range that contains the current playback position.
        // After seeks, the first range may cover an earlier portion of the
        // stream, so picking it would underreport available buffer.
        let current = CMTime(seconds: currentTime, preferredTimescale: 600)
        let matching = item.loadedTimeRanges
            .map(\.timeRangeValue)
            .first { CMTimeRangeContainsTime($0, time: current) }

        let range = matching ?? item.loadedTimeRanges.last?.timeRangeValue
        guard let range else { return }
        bufferedTime = range.start.seconds + range.duration.seconds
    }

    /// Derive duration from seekableTimeRanges for HLS content where
    /// AVPlayerItem.duration may report indefinite or a partial value
    /// until the full manifest is parsed.
    @MainActor
    private func updateDurationFromSeekableRanges(_ item: AVPlayerItem) {
        guard let range = item.seekableTimeRanges.last?.timeRangeValue else { return }
        let seekableEnd = range.start.seconds + range.duration.seconds
        guard seekableEnd.isFinite, seekableEnd > 0 else { return }

        // Once we have an authoritative duration from AVPlayerItem.duration,
        // only allow seekable ranges to INCREASE it (never decrease).
        // This prevents partial HLS segment lists from shrinking the
        // displayed duration below the real content length.
        if hasDefinitiveDuration {
            if seekableEnd > duration {
                duration = seekableEnd
            }
        } else {
            let itemDuration = item.duration.seconds
            if !itemDuration.isFinite || itemDuration <= 0 || seekableEnd > itemDuration {
                duration = seekableEnd
            }
        }
    }

    /// Load the asset's own duration property, which forces AVFoundation
    /// to fully parse an HLS manifest (including all variant playlists).
    /// This gives the authoritative total length for VOD content.
    @MainActor
    private func loadAssetDuration(_ asset: AVURLAsset) async {
        do {
            let assetDuration = try await asset.load(.duration)
            let seconds = assetDuration.seconds
            guard seconds.isFinite, seconds > 0 else { return }

            // Only adopt the asset duration when it is larger than what
            // we already have, to avoid overwriting a correct value with
            // a stale one if the user switched content in the meantime.
            if seconds > duration || !hasDefinitiveDuration {
                duration = seconds
                hasDefinitiveDuration = true
                logger.info(
                    "Asset duration loaded",
                    context: ["duration": String(format: "%.1f", seconds)]
                )
            }
        } catch {
            logger.warning(
                "Asset duration load failed, relying on item/seekable ranges",
                context: ["error": error.localizedDescription]
            )
        }
    }
}
