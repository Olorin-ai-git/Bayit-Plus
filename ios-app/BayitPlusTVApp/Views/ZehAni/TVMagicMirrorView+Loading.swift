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
                    let avatarsResponse = try await repos.starStory.fetchAvatars(
                        profileId: profileId
                    )
                    let loadedAvatars = avatarsResponse.avatars

                    let targetAvatarId = selectedAvatarId
                        ?? loadedAvatars.first(where: { $0.isActiveAvatar })?.avatarId
                        ?? loadedAvatars.first?.avatarId

                    let fetched = try await repos.avatarMeshRepository.getMagicMirrorGreeting(
                        profileId: profileId,
                        avatarId: targetAvatarId
                    )

                    await MainActor.run {
                        avatars = loadedAvatars
                        selectedAvatarId = targetAvatarId
                        existingAvatarId = targetAvatarId
                        greeting = fetched
                        isLoading = false
                    }

                    if let targetAvatarId {
                        await loadAvatarImage(avatarId: targetAvatarId)
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
            let selected = avatars.first(where: { $0.avatarId == avatarId })
            if let imageUrl = selected?.creatifyAvatarImageUrl {
                await MainActor.run { avatarImageUrl = imageUrl }
                return
            }

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
