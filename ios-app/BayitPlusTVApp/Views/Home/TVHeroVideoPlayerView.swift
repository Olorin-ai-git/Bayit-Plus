#if os(tvOS)
    import AVKit
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    struct TVHeroVideoPlayerView: View {
        let url: URL
        let isActive: Bool
        let resumePosition: TimeInterval?

        @State private var player: AVPlayer?
        @State private var deactivateTask: Task<Void, Never>?
        @State private var loopObserver: NSObjectProtocol?

        private let logger = BayitLogger(category: "TVHeroVideoPlayer")

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
                if isActive { activatePlayer() }
            }
            .onDisappear {
                tearDownPlayer()
            }
        }

        private func activatePlayer() {
            deactivateTask?.cancel()
            deactivateTask = nil

            guard isMemoryAvailable() else {
                logger.info("Low memory, skipping hero video")
                return
            }

            if player == nil {
                let item = AVPlayerItem(url: url)
                item.preferredForwardBufferDuration = 5
                let avPlayer = AVPlayer(playerItem: item)
                avPlayer.isMuted = true
                avPlayer.allowsExternalPlayback = false
                avPlayer.automaticallyWaitsToMinimizeStalling = true
                if let position = resumePosition {
                    let time = CMTime(
                        seconds: position,
                        preferredTimescale: 600
                    )
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
                await MainActor.run { tearDownPlayer() }
            }
        }

        private func tearDownPlayer() {
            deactivateTask?.cancel()
            deactivateTask = nil
            if let observer = loopObserver {
                NotificationCenter.default.removeObserver(observer)
                loopObserver = nil
            }
            player?.pause()
            player = nil
        }

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

        private func isMemoryAvailable() -> Bool {
            let available = os_proc_available_memory()
            let threshold: UInt64 = 200 * 1024 * 1024
            return available > threshold
        }
    }
#endif
