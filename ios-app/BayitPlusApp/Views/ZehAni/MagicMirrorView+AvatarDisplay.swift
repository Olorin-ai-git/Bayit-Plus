import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Avatar Display

extension MagicMirrorView {
    func avatarDisplayView(_ greeting: MagicMirrorGreeting) -> some View {
        ZStack {
            if isPlayingVideo, let player = player {
                VideoPlayer(player: player)
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
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
                        image.resizable().scaledToFit()
                    case .failure:
                        avatarPlaceholder
                    default:
                        ProgressView().tint(.white)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: 400)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .overlay(alignment: .bottom) {
                    if greeting.lipsyncVideoUrl != nil {
                        playGreetingButton(greeting)
                    }
                }
            } else {
                avatarPlaceholder
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            }
        }
    }

    func playGreetingButton(_ greeting: MagicMirrorGreeting) -> some View {
        GlassButton(
            localization.t("zehAni.magicMirror.playGreeting"),
            variant: .primary,
            size: .small
        ) {
            guard let videoUrlString = greeting.lipsyncVideoUrl,
                  let videoUrl = URL(string: videoUrlString) else { return }
            let avPlayer = AVPlayer(url: videoUrl)
            player = avPlayer
            isPlayingVideo = true
            avPlayer.play()
        }
        .padding(DesignTokens.Spacing.sm)
    }

    var avatarPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bg.opacity(0.3))
            .overlay {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }
}
