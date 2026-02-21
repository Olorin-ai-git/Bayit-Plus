#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - PauseAskDialogueOverlayView Conversation Extensions

    extension PauseAskDialogueOverlayView {
        func progressView(_ text: String) -> some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                Text(text)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        // MARK: - Video Playback

        func videoPlaybackView(isUserPhase _: Bool) -> some View {
            VStack {
                Spacer()
                HStack(spacing: DesignTokens.Spacing.xl) {
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
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.top, DesignTokens.Spacing.sm)
                }

                Spacer()
            }
        }

        var userCircle: some View {
            ZStack {
                stillImage(url: avatarImageUrl)
                if isUserVideoReady, let player = userPlayer {
                    VideoPlayer(player: player)
                        .scaleEffect(2)
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
                if let frameUrl = viewModel.selectedCharacter?.frameUrl {
                    stillImage(url: frameUrl)
                }
                if isCharacterVideoReady, let player = characterPlayer {
                    VideoPlayer(player: player)
                        .scaleEffect(2)
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
            CachedAsyncImage(url: URL(string: url)) { imgPhase in
                switch imgPhase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    Color.black
                }
            }
        }

        // MARK: - Idle Panel

        var idlePanel: some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                Spacer()
                HStack(spacing: DesignTokens.Spacing.md) {
                    GlassButton(
                        localization.t("player.pauseAsk.askAnother"),
                        variant: .primary, size: .medium
                    ) { phase = .input; messageText = "" }

                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .medium
                    ) { onDismiss() }
                }
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
    }
#endif
