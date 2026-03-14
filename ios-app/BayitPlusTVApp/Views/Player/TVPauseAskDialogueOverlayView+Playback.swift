#if os(tvOS)
    import AVFoundation
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Video Playback Actions

    extension TVPauseAskDialogueOverlayView {
        func playResponse(_ response: PauseAskResponse) async {
            await playCharacter(response)
        }

        func playCharacter(_ response: PauseAskResponse) async {
            guard let url = URL(string: response.characterAnimatedVideoUrl) else {
                phase = .idle; return
            }

            cleanupCharacterPlayer()
            let player = AVPlayer(url: url)
            player.automaticallyWaitsToMinimizeStalling = true
            characterPlayer = player
            phase = .characterSpeaking

            characterEndObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { [weak player] _ in
                guard player != nil else { return }
                Task { @MainActor in
                    cleanupCharacterPlayer()
                    phase = .idle
                }
            }

            guard let item = player.currentItem else {
                logger.error("Character player has no current item")
                phase = .idle
                return
            }

            characterStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation { isCharacterVideoReady = true }
                        player?.play()
                    case .failed:
                        logger.error(
                            "tvOS character video failed: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupCharacterPlayer()
                        phase = .idle
                    default:
                        break
                    }
                }
            }
        }

        func cleanupCharacterPlayer() {
            if let obs = characterEndObserver {
                NotificationCenter.default.removeObserver(obs)
                characterEndObserver = nil
            }
            characterStatusObserver?.invalidate()
            characterStatusObserver = nil
            characterPlayer?.pause()
            characterPlayer = nil
            isCharacterVideoReady = false
        }
    }
#endif
