#if os(iOS)
    import AVFoundation
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Circle display views and still image rendering for interactive moment overlay.
    extension InteractiveMomentOverlayView {
        // MARK: - Circles

        var avatarCircle: some View {
            ZStack {
                stillImage(url: avatarImageUrl)
                if isAvatarVideoReady, let player = avatarPlayer {
                    FillVideoLayer(player: player)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
            .shadow(
                color: DesignTokens.Primary.default.opacity(0.4),
                radius: 12, x: 0, y: 4
            )
        }

        var characterCircle: some View {
            ZStack {
                if let imgUrl = characterImageUrl {
                    stillImage(url: imgUrl)
                }
                if isCharacterVideoReady, let player = characterPlayer {
                    FillVideoLayer(player: player)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
            .shadow(
                color: DesignTokens.Primary.default.opacity(0.4),
                radius: 12, x: 0, y: 4
            )
        }

        func stillImage(url: String) -> some View {
            CachedAsyncImage(url: URL(string: url)) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    Color.black
                }
            }
        }
    }

    // InteractionOverlayPhase and FillVideoLayer defined in InteractiveMomentOverlayView+Players.swift
#endif
