#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Dual-circle overlay for interactive moments: child avatar (left) and
    /// movie character (right). The movie never pauses -- volume ducks while
    /// the conversation plays, then restores on dismiss.
    struct TVInteractiveMomentOverlayView: View {
        let avatarVideoUrl: String
        let avatarImageUrl: String
        let characterVideoUrl: String?
        let characterImageUrl: String?
        let onDismiss: () -> Void

        let circleSize: CGFloat = 240
        let transitionDelay: TimeInterval = 0.5
        let logger = BayitLogger(category: "TVInteractiveMoment")

        @State var phase: OverlayPhase = .avatarSpeaking
        @State var avatarPlayer: AVPlayer?
        @State var characterPlayer: AVPlayer?
        @State var isAvatarVideoReady = false
        @State var isCharacterVideoReady = false

        var body: some View {
            VStack {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.xxl) {
                    Spacer()
                    avatarCircle
                        .opacity(phase != .done ? 1 : 0)
                        .scaleEffect(phase != .done ? 1 : 0.8)

                    if characterVideoUrl != nil || characterImageUrl != nil {
                        characterCircle
                            .opacity(phase == .characterSpeaking ? 1 : 0)
                            .scaleEffect(phase == .characterSpeaking ? 1 : 0.8)
                    }
                    Spacer()
                }
                .padding(.bottom, 140)
            }
            .animation(.easeInOut(duration: 0.4), value: phase)
            .allowsHitTesting(false)
            .onAppear { setupAvatarPlayer() }
            .onDisappear { cleanupPlayers() }
        }

        // MARK: - Circles

        private var avatarCircle: some View {
            ZStack {
                stillImage(url: avatarImageUrl)
                if isAvatarVideoReady, let player = avatarPlayer {
                    FillVideoLayer(player: player)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
            .shadow(
                color: DesignTokens.Primary.default.opacity(0.4),
                radius: 20, x: 0, y: 8
            )
        }

        private var characterCircle: some View {
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
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
            .shadow(
                color: DesignTokens.Primary.default.opacity(0.4),
                radius: 20, x: 0, y: 8
            )
        }

        private func stillImage(url: String) -> some View {
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

    // MARK: - Overlay Phase

    enum OverlayPhase {
        case avatarSpeaking
        case transition
        case characterSpeaking
        case done
    }
#endif
