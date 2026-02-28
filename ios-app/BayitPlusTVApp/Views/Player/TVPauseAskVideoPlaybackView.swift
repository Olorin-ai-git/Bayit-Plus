#if os(tvOS)
    import AVFoundation
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Display-only video playback component for tvOS Pause & Ask.
    /// Shows user and character circles with lip-sync video overlays.
    struct TVPauseAskVideoPlaybackView: View {
        let avatarImageUrl: String
        let characterFrameUrl: String?
        let lastResponse: PauseAskResponse?
        @Binding var phase: PauseAskPhase
        @Binding var userPlayer: AVPlayer?
        @Binding var characterPlayer: AVPlayer?
        @Binding var isUserVideoReady: Bool
        @Binding var isCharacterVideoReady: Bool

        private let circleSize: CGFloat = 160

        var body: some View {
            VStack {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.xxl) {
                    Spacer()
                    userCircle
                        .opacity(phase == .userSpeaking ? 1 : 0.5)
                        .scaleEffect(phase == .userSpeaking ? 1 : 0.85)
                    characterCircle
                        .opacity(phase == .characterSpeaking ? 1 : 0.5)
                        .scaleEffect(phase == .characterSpeaking ? 1 : 0.85)
                    Spacer()
                }

                if let response = lastResponse {
                    Text(phase == .userSpeaking
                        ? response.userPolishedText
                        : response.characterResponseText)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.top, TVDesignTokens.Spacing.md)
                }
                Spacer()
            }
        }

        private var userCircle: some View {
            ZStack {
                stillImage(url: avatarImageUrl)
                if isUserVideoReady, let player = userPlayer {
                    FillVideoLayer(player: player)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
        }

        private var characterCircle: some View {
            ZStack {
                if let frameUrl = characterFrameUrl {
                    stillImage(url: frameUrl)
                }
                if isCharacterVideoReady, let player = characterPlayer {
                    FillVideoLayer(player: player)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
        }

        private func stillImage(url: String) -> some View {
            CachedAsyncImage(url: URL(string: url)) { imgPhase in
                switch imgPhase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    Color.black
                }
            }
        }
    }
#endif
