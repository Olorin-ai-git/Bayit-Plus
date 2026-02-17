#if os(tvOS)
import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVMagicMirrorView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var existingAvatarId: String?
    @State private var avatarImageUrl: String?
    @State private var isPlayingVideo = false
    @State private var player: AVPlayer?
    @FocusState private var refreshButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            } else if let errorMsg = error {
                errorView(errorMsg)
            } else if let greeting = greeting {
                greetingContent(greeting)
            }
        }
        .onAppear {
            loadGreeting()
        }
    }

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                avatarDisplayView(greeting)

                TVMagicMirrorGreetingCard(greeting: greeting)

                TVMagicMirrorVocabularyCard(greeting: greeting)

                TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                    loadGreeting()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(message)
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .multilineTextAlignment(.center)

            TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                loadGreeting()
            }
        }
    }

    @ViewBuilder
    private func avatarDisplayView(_ greeting: MagicMirrorGreeting) -> some View {
        ZStack {
            if isPlayingVideo, let player = player {
                VideoPlayer(player: player)
                    .frame(height: 320)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
                    .onReceive(NotificationCenter.default.publisher(
                        for: .AVPlayerItemDidPlayToEndTime
                    )) { _ in
                        isPlayingVideo = false
                        self.player = nil
                    }
            } else if let imageUrlString = avatarImageUrl,
                      let imageUrl = URL(string: imageUrlString) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        avatarPlaceholder
                    default:
                        ProgressView().tint(.white).scaleEffect(1.5)
                    }
                }
                .frame(height: 320)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .overlay(alignment: .bottom) {
                    if greeting.lipsyncVideoUrl != nil {
                        Button {
                            playGreetingVideo(greeting)
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "play.fill")
                                Text(localization.t("zehAni.magicMirror.playGreeting"))
                            }
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                        }
                        .buttonStyle(.card)
                        .padding(TVDesignTokens.Spacing.md)
                    }
                }
            } else {
                avatarPlaceholder
                    .frame(height: 320)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
            }
        }
    }

    private var avatarPlaceholder: some View {
        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
            .overlay {
                VStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 60))
                        .foregroundStyle(DesignTokens.Text.muted)
                    Text(localization.t("zehAni.magicMirror.meshUnavailable"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
    }

    private func playGreetingVideo(_ greeting: MagicMirrorGreeting) {
        guard let videoUrlString = greeting.lipsyncVideoUrl,
              let videoUrl = URL(string: videoUrlString) else { return }
        let avPlayer = AVPlayer(url: videoUrl)
        player = avPlayer
        isPlayingVideo = true
        avPlayer.play()
    }

    private func loadGreeting() {
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

    private func loadAvatarImage(avatarId: String) async {
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
}
#endif
