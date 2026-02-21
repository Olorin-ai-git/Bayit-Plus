#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - TVAvatarDialogueOverlayView + Actions

    extension TVAvatarDialogueOverlayView {
        func sendMessage() {
            let text = messageText
            messageText = ""
            cleanupCharacterPlayer()
            resumeTask?.cancel()

            // Capture play state before the async work begins
            let wasPlaying = mediaPlayer.state == .playing
            wasPlayingBeforeResponse = wasPlaying

            Task {
                if viewModel.isMultiCharacterMode {
                    let response = await viewModel.sendMultiCharacterMessage(text)

                    // Pause the movie when the response arrives
                    if wasPlaying { mediaPlayer.pause() }

                    if let first = response?.exchanges.first(where: { $0.animatedVideoUrl != nil }),
                       let url = first.animatedVideoUrl
                    {
                        playCharacterVideo(urlString: url)
                    } else if wasPlaying {
                        scheduleResume()
                    }
                } else {
                    let response = await viewModel.sendMessage(text)

                    // Pause the movie when the response arrives
                    if wasPlaying { mediaPlayer.pause() }

                    if let videoUrl = response?.animatedVideoUrl {
                        playCharacterVideo(urlString: videoUrl)
                    } else if wasPlaying {
                        scheduleResume()
                    }
                }
            }
        }

        func scheduleResume() {
            resumeTask = Task {
                try? await Task.sleep(for: .seconds(4))
                guard !Task.isCancelled else { return }
                mediaPlayer.play()
            }
        }

        func playCharacterVideo(urlString: String) {
            guard let url = URL(string: urlString) else { return }
            let player = AVPlayer(url: url)
            characterPlayer = player

            let shouldResume = wasPlayingBeforeResponse
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { _ in
                Task { @MainActor in
                    isCharacterVideoReady = false
                    characterPlayer = nil
                    if shouldResume {
                        mediaPlayer.play()
                    }
                }
            }
            Task {
                try? await Task.sleep(for: .seconds(0.3))
                await MainActor.run {
                    withAnimation(.easeIn(duration: 0.3)) { isCharacterVideoReady = true }
                    player.play()
                }
            }
        }

        func cleanupCharacterPlayer() {
            characterPlayer?.pause()
            characterPlayer = nil
            isCharacterVideoReady = false
        }
    }
#endif
