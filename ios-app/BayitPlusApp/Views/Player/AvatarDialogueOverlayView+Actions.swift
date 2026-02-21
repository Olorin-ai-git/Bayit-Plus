#if os(iOS)
    import AVFoundation
    import BayitDesignSystem
    import SwiftUI

    /// Extension on AvatarDialogueOverlayView providing send, video playback, and cleanup actions.
    extension AvatarDialogueOverlayView {
        func sendMessage() {
            let text = messageText
            messageText = ""
            cleanupCharacterPlayer()

            Task {
                if viewModel.isMultiCharacterMode {
                    let response = await viewModel.sendMultiCharacterMessage(text)
                    if let first = response?.exchanges.first(where: { $0.animatedVideoUrl != nil }),
                       let url = first.animatedVideoUrl
                    {
                        playCharacterVideo(urlString: url)
                    }
                } else {
                    let response = await viewModel.sendMessage(text)
                    if let videoUrl = response?.animatedVideoUrl {
                        playCharacterVideo(urlString: videoUrl)
                    }
                }
            }
        }

        func playCharacterVideo(urlString: String) {
            guard let url = URL(string: urlString) else { return }
            let player = AVPlayer(url: url)
            characterPlayer = player
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { _ in
                Task { @MainActor in
                    isCharacterVideoReady = false
                    characterPlayer = nil
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
