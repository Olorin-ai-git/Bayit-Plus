import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct LiveAvatarOverlayView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos

    let avatarId: String
    let contentId: String
    var lipsyncVideoUrl: String?

    @State private var avatarImageUrl: String?
    @State private var isLoading = true
    @State private var error: String?
    @State private var isPlayingVideo = false
    @State private var player: AVPlayer?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if isLoading {
                ProgressView()
                    .tint(.white)
            } else if let error = error {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .padding(DesignTokens.Spacing.sm)
            } else {
                avatarOverlay
            }
        }
        .onAppear {
            loadAvatarImage()
        }
    }

    private var avatarOverlay: some View {
        ZStack {
            if isPlayingVideo, let player = player {
                VideoPlayer(player: player)
                    .onReceive(NotificationCenter.default.publisher(
                        for: .AVPlayerItemDidPlayToEndTime
                    )) { _ in
                        isPlayingVideo = false
                        self.player = nil
                    }
            } else if let imageUrlString = avatarImageUrl,
                      let imageUrl = URL(string: imageUrlString)
            {
                CachedAsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().scaledToFill()
                    default:
                        Color.clear
                    }
                }
            }
        }
        .frame(width: 160, height: 160)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: DesignTokens.Spacing.sm, x: 0, y: 4)
        .padding(DesignTokens.Spacing.base)
        .onTapGesture {
            playLipsyncVideo()
        }
    }

    private func loadAvatarImage() {
        Task {
            do {
                let status = try await repos.avatarMeshRepository.fetchAvatarStatus(
                    avatarId: avatarId
                )
                await MainActor.run {
                    avatarImageUrl = status.avatarImageUrl
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }

    private func playLipsyncVideo() {
        guard let urlString = lipsyncVideoUrl,
              let videoUrl = URL(string: urlString) else { return }
        let avPlayer = AVPlayer(url: videoUrl)
        player = avPlayer
        isPlayingVideo = true
        avPlayer.play()
    }
}
