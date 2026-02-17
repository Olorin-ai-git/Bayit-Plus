#if os(iOS)
import AVFoundation
import AVKit
import BayitDesignSystem
import SwiftUI

/// Extracted circles row for avatar dialogue overlay.
/// Shows user avatar and character avatar side by side.
struct DialogueCirclesView: View {

    let avatarImageUrl: String
    let characterFrameUrl: String
    let characterPlayer: AVPlayer?
    let isCharacterVideoReady: Bool
    let circleSize: CGFloat

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()
            avatarCircle
            characterCircle
            Spacer()
        }
    }

    private var avatarCircle: some View {
        AsyncImage(url: URL(string: avatarImageUrl)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Color.gray.opacity(0.3)
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 8, x: 0, y: 2
        )
    }

    private var characterCircle: some View {
        ZStack {
            AsyncImage(url: URL(string: characterFrameUrl)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Color.gray.opacity(0.3)
                }
            }

            if isCharacterVideoReady, let player = characterPlayer {
                VideoPlayer(player: player)
                    .scaledToFill()
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 8, x: 0, y: 2
        )
    }
}
#endif
