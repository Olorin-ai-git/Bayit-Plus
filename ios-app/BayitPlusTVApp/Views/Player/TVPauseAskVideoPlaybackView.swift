#if os(tvOS)
    import AVFoundation
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Display-only video playback component for tvOS Pause & Ask.
    /// Shows character circle with lip-sync video overlay and response text.
    struct TVPauseAskVideoPlaybackView: View {
        let characterFrameUrl: String?
        let lastResponse: PauseAskResponse?
        @Binding var phase: PauseAskPhase
        @Binding var characterPlayer: AVPlayer?
        @Binding var isCharacterVideoReady: Bool

        private let circleSize: CGFloat = 200

        var body: some View {
            VStack {
                Spacer()
                characterCircle
                    .scaleEffect(phase == .characterSpeaking ? 1 : 0.85)

                if let response = lastResponse {
                    Text(response.characterResponseText)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.top, TVDesignTokens.Spacing.md)
                        .accessibilityLabel(response.characterResponseText)
                }
                Spacer()
            }
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
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 3))
            .shadow(
                color: DesignTokens.Primary.default.opacity(0.4), radius: 16
            )
            .accessibilityLabel("Character responding")
            .accessibilityAddTraits(
                phase == .characterSpeaking ? .updatesFrequently : []
            )
        }

        private func stillImage(url: String) -> some View {
            CachedAsyncImage(url: URL(string: url)) { imgPhase in
                switch imgPhase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    DesignTokens.Colors.Background.primary
                }
            }
        }
    }
#endif
