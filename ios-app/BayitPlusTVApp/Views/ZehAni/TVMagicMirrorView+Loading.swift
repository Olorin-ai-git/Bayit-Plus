#if os(tvOS)
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Loading & Avatar Image

    extension TVMagicMirrorView {
        func loadGreeting() {
            isLoading = true
            error = nil
            avatarImageUrl = nil
            isPlayingVideo = false
            player = nil

            Task {
                do {
                    async let greetingTask = repos.avatarMeshRepository.getMagicMirrorGreeting(
                        profileId: profileId
                    )
                    async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)

                    let fetched = try await greetingTask
                    let avatarsResponse = try? await avatarsTask
                    let avatarId = avatarsResponse?.avatars.first?.avatarId

                    await MainActor.run {
                        greeting = fetched
                        existingAvatarId = avatarId
                        isLoading = false
                    }

                    if let avatarId {
                        await loadAvatarImage(avatarId: avatarId)
                    }
                } catch {
                    await MainActor.run {
                        self.error = error.localizedDescription
                        isLoading = false
                    }
                }
            }
        }

        func loadAvatarImage(avatarId: String) async {
            do {
                let status = try await repos.avatarMeshRepository.fetchAvatarStatus(
                    avatarId: avatarId
                )
                await MainActor.run {
                    avatarImageUrl = status.avatarImageUrl
                }
            } catch {
                // Avatar image is optional; greeting still works without it
            }
        }

        func playGreetingVideo(_ greeting: MagicMirrorGreeting) {
            guard let videoUrlString = greeting.lipsyncVideoUrl,
                  let videoUrl = URL(string: videoUrlString) else { return }
            let avPlayer = AVPlayer(url: videoUrl)
            player = avPlayer
            isPlayingVideo = true
            avPlayer.play()
        }
    }
#endif
