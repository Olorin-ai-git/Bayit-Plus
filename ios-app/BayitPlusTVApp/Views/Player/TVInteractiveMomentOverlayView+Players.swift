#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    // MARK: - TVInteractiveMomentOverlayView + Player Logic

    extension TVInteractiveMomentOverlayView {
        // MARK: - Avatar Player

        func setupAvatarPlayer() {
            guard let url = URL(string: avatarVideoUrl) else {
                logger.error("Invalid avatar video URL: \(avatarVideoUrl)")
                onDismiss()
                return
            }

            let player = AVPlayer(url: url)
            avatarPlayer = player

            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem,
                queue: .main
            ) { _ in
                Task { @MainActor in onAvatarFinished() }
            }

            Task {
                let ready = await waitForPlayerReady(player, label: "avatar")
                await MainActor.run {
                    guard ready else {
                        logger.error("Avatar video failed to load")
                        onDismiss()
                        return
                    }
                    withAnimation(.easeIn(duration: 0.3)) {
                        isAvatarVideoReady = true
                    }
                    player.play()
                }
            }
        }

        func onAvatarFinished() {
            guard let charUrl = characterVideoUrl,
                  URL(string: charUrl) != nil
            else {
                logger.info(
                    "No character response video, dismissing"
                )
                dismissAfterDelay()
                return
            }

            logger.info("Avatar finished, transitioning to character")
            phase = .transition
            Task {
                try? await Task.sleep(for: .seconds(transitionDelay))
                await MainActor.run {
                    setupCharacterPlayer(urlString: charUrl)
                }
            }
        }

        // MARK: - Character Player

        func setupCharacterPlayer(urlString: String) {
            guard let url = URL(string: urlString) else {
                logger.error("Invalid character video URL: \(urlString)")
                dismissAfterDelay()
                return
            }

            logger.info("Setting up character player: \(urlString)")
            let player = AVPlayer(url: url)
            characterPlayer = player
            phase = .characterSpeaking

            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem,
                queue: .main
            ) { _ in
                Task { @MainActor in dismissAfterDelay() }
            }

            Task {
                let ready = await waitForPlayerReady(player, label: "character")
                await MainActor.run {
                    guard ready else {
                        logger.error("Character video failed to load")
                        dismissAfterDelay()
                        return
                    }
                    withAnimation(.easeIn(duration: 0.3)) {
                        isCharacterVideoReady = true
                    }
                    player.play()
                    logger.info("Character video playing")
                }
            }
        }

        // MARK: - Player Readiness

        func waitForPlayerReady(
            _ player: AVPlayer,
            label: String
        ) async -> Bool {
            guard let item = player.currentItem else {
                logger.error("\(label) player has no current item")
                return false
            }

            let maxWaitSeconds = 10.0
            let pollInterval = 0.1
            var elapsed = 0.0

            while elapsed < maxWaitSeconds {
                switch item.status {
                case .readyToPlay:
                    logger.info(
                        "\(label) video ready after \(String(format: "%.1f", elapsed))s"
                    )
                    return true
                case .failed:
                    let errorDesc = item.error?.localizedDescription ?? "unknown"
                    logger.error(
                        "\(label) video failed to load: \(errorDesc)"
                    )
                    return false
                case .unknown:
                    try? await Task.sleep(for: .seconds(pollInterval))
                    elapsed += pollInterval
                @unknown default:
                    try? await Task.sleep(for: .seconds(pollInterval))
                    elapsed += pollInterval
                }
            }

            logger.error(
                "\(label) video timed out after \(maxWaitSeconds)s"
            )
            return false
        }

        // MARK: - Lifecycle

        func dismissAfterDelay() {
            phase = .done
            Task {
                try? await Task.sleep(for: .seconds(0.3))
                await MainActor.run { onDismiss() }
            }
        }

        func cleanupPlayers() {
            avatarPlayer?.pause()
            avatarPlayer = nil
            characterPlayer?.pause()
            characterPlayer = nil
        }
    }
#endif
