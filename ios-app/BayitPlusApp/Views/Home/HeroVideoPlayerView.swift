import AVKit
import BayitCore
import SwiftUI

/// Muted looping video player for hero card backgrounds on iOS.
/// Adapts from tvOS with tighter memory budget and app lifecycle handling.
struct HeroVideoPlayerView: View {
    let url: URL
    let isActive: Bool
    let resumePosition: TimeInterval?

    @State private var player: AVPlayer?
    @State private var deactivateTask: Task<Void, Never>?
    @State private var teardownTimer: Task<Void, Never>?
    @State private var loopObserver: NSObjectProtocol?
    @State private var sceneObserver: NSObjectProtocol?
    @State private var wasPlayingBeforeBackground = false

    private let logger = BayitLogger(category: "HeroVideoPlayer")
    private let memoryThresholdBytes: UInt64 = 100 * 1024 * 1024

    var body: some View {
        Group {
            if let player {
                VideoPlayer(player: player)
                    .disabled(true)
                    .allowsHitTesting(false)
            } else {
                Color.clear
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onChange(of: isActive) { _, active in
            if active {
                activatePlayer()
            } else {
                scheduleDeactivation()
            }
        }
        .onAppear {
            observeAppLifecycle()
            if isActive { activatePlayer() }
        }
        .onDisappear {
            tearDownPlayer()
            removeLifecycleObservers()
        }
    }

    // MARK: - Player Lifecycle

    private func activatePlayer() {
        deactivateTask?.cancel()
        deactivateTask = nil
        teardownTimer?.cancel()
        teardownTimer = nil

        guard isMemoryAvailable() else {
            logger.info("Low memory, skipping hero video")
            return
        }

        if player == nil {
            let item = AVPlayerItem(url: url)
            item.preferredForwardBufferDuration = 3
            let avPlayer = AVPlayer(playerItem: item)
            avPlayer.isMuted = true
            avPlayer.allowsExternalPlayback = false
            avPlayer.automaticallyWaitsToMinimizeStalling = true
            if let position = resumePosition {
                let time = CMTime(seconds: position, preferredTimescale: 600)
                avPlayer.seek(to: time)
            }
            player = avPlayer
            setupLoop(for: avPlayer)
        }

        player?.play()
    }

    private func scheduleDeactivation() {
        player?.pause()
        deactivateTask = Task {
            try? await Task.sleep(for: .seconds(1.5))
            guard !Task.isCancelled else { return }
            await MainActor.run { startTeardownTimer() }
        }
    }

    private func startTeardownTimer() {
        teardownTimer?.cancel()
        teardownTimer = Task {
            try? await Task.sleep(for: .seconds(30))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                logger.info("Tearing down hero video after 30s idle")
                tearDownPlayer()
            }
        }
    }

    private func tearDownPlayer() {
        deactivateTask?.cancel()
        deactivateTask = nil
        teardownTimer?.cancel()
        teardownTimer = nil
        if let observer = loopObserver {
            NotificationCenter.default.removeObserver(observer)
            loopObserver = nil
        }
        player?.pause()
        player = nil
    }

    // MARK: - Looping

    private func setupLoop(for avPlayer: AVPlayer) {
        if let existing = loopObserver {
            NotificationCenter.default.removeObserver(existing)
        }
        loopObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: avPlayer.currentItem,
            queue: .main
        ) { _ in
            avPlayer.seek(to: .zero)
            avPlayer.play()
        }
    }

    // MARK: - App Lifecycle

    private func observeAppLifecycle() {
        sceneObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            wasPlayingBeforeBackground = player?.rate ?? 0 > 0
            player?.pause()
        }

        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            if wasPlayingBeforeBackground, isActive {
                player?.play()
            }
        }
    }

    private func removeLifecycleObservers() {
        if let observer = sceneObserver {
            NotificationCenter.default.removeObserver(observer)
            sceneObserver = nil
        }
    }

    // MARK: - Memory Guard

    private func isMemoryAvailable() -> Bool {
        let available = os_proc_available_memory()
        return available > memoryThresholdBytes
    }
}
