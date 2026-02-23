#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - PauseAskDialogueOverlayView Conversation Extensions

    extension PauseAskDialogueOverlayView {
        // MARK: - Polishing Progress

        var polishingProgressView: some View {
            let stages = polishingStageKeys
            let key = stages[polishingStageIndex % stages.count]
            let text: String = if key.contains("generic") {
                localization.t(
                    key,
                    ["name": viewModel.selectedCharacter?.name ?? ""]
                )
            } else {
                localization.t(key)
            }

            return VStack(spacing: DesignTokens.Spacing.md) {
                GlassSpinner(size: .large)
                Text(text)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .animation(.easeInOut(duration: 0.4), value: polishingStageIndex)
            }
            .onAppear { startPolishingTimer() }
            .onDisappear { stopPolishingTimer() }
        }

        func startPolishingTimer() {
            polishingStageIndex = 0
            polishingTimer = Timer.scheduledTimer(
                withTimeInterval: 5, repeats: true
            ) { _ in
                Task { @MainActor in
                    polishingStageIndex += 1
                }
            }
        }

        func stopPolishingTimer() {
            polishingTimer?.invalidate()
            polishingTimer = nil
            polishingStageIndex = 0
        }

        var polishingStageKeys: [String] {
            let base = "player.pauseAsk.stages"
            let generic = [
                "\(base).polishing", "\(base).thinking",
            ]
            let characterKeys = characterStageKeys(base: base)
            return generic + characterKeys
        }

        private func characterStageKeys(base: String) -> [String] {
            let name = viewModel.selectedCharacter?.name.lowercased() ?? ""
            if name.contains("biff") {
                return (1 ... 4).map { "\(base).biff\($0)" }
            } else if name.contains("doc") {
                return (1 ... 4).map { "\(base).doc\($0)" }
            } else if name.contains("marty") {
                return (1 ... 4).map { "\(base).marty\($0)" }
            } else if name.contains("george") {
                return (1 ... 4).map { "\(base).george\($0)" }
            } else if name.contains("lorraine") {
                return (1 ... 4).map { "\(base).lorraine\($0)" }
            } else if name.contains("jennifer") {
                return (1 ... 4).map { "\(base).jennifer\($0)" }
            } else {
                return (1 ... 4).map { "\(base).generic\($0)" }
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
