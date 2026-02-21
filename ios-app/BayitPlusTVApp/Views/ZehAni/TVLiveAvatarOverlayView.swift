import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVLiveAvatarOverlayView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

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
                    .frame(width: 280, height: 280)
            } else if let error {
                Text(error)
                    .foregroundColor(DesignTokens.Colors.Semantic.error)
                    .font(.system(size: 24))
                    .frame(width: 280, height: 280)
            } else {
                avatarOverlay
            }
        }
        .padding(40)
        .onAppear { loadAvatarImage() }
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
        .frame(width: 280, height: 280)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.15), lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.5), radius: 12, x: 0, y: 6)
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
