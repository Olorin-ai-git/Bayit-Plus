#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// tvOS Pause & Ask overlay with focus-based navigation.
    /// Larger circles (160pt) for 10-foot UI, Siri Remote voice input.
    struct TVPauseAskDialogueOverlayView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(AuthManager.self) private var authManager

        let avatarImageUrl: String
        let avatarId: String?
        let contentId: String
        let currentTimestamp: Double
        let characters: [ContentCharacter]
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: TVVoiceInteractionService?
        let onDismiss: () -> Void

        @State var phase: PauseAskPhase = .selecting
        @State var messageText = ""
        @State var userPlayer: AVPlayer?
        @State var characterPlayer: AVPlayer?
        @State var isUserVideoReady = false
        @State var isCharacterVideoReady = false
        @State var lastResponse: PauseAskResponse?
        @State var userEndObserver: NSObjectProtocol?
        @State var characterEndObserver: NSObjectProtocol?
        @State var userStatusObserver: NSKeyValueObservation?
        @State var characterStatusObserver: NSKeyValueObservation?
        @State var polishingStageIndex = 0
        @State var polishingTimer: Timer?
        @State var lastFailedMessage = ""

        let logger = BayitLogger(category: "TVPauseAskOverlay")

        var body: some View {
            ZStack {
                Color.black.opacity(0.5).ignoresSafeArea()
                phaseContent
            }
            .animation(.easeInOut(duration: 0.3), value: phase)
        }

        // MARK: - Phase Router

        @ViewBuilder
        private var phaseContent: some View {
            switch phase {
            case .selecting:
                TVPauseAskCharacterSelectionView(
                    characters: characters,
                    onSelectCharacter: { character in
                        Task { await selectCharacter(character) }
                    },
                    onDismiss: onDismiss
                )
            case .input:
                inputPanel
            case .polishing:
                polishingProgressView
            case .userSpeaking, .transition, .characterSpeaking:
                TVPauseAskVideoPlaybackView(
                    avatarImageUrl: avatarImageUrl,
                    characterFrameUrl: viewModel.selectedCharacter?.frameUrl,
                    lastResponse: lastResponse,
                    phase: $phase,
                    userPlayer: $userPlayer,
                    characterPlayer: $characterPlayer,
                    isUserVideoReady: $isUserVideoReady,
                    isCharacterVideoReady: $isCharacterVideoReady
                )
            case .idle:
                idlePanel
            case .error:
                errorPanel
            }
        }

        // MARK: - Input Panel

        private var inputPanel: some View {
            TVPauseAskInputPanelView(
                characterName: viewModel.selectedCharacter?.name,
                messageText: $messageText,
                isSending: viewModel.isSending,
                onSend: { sendQuestion() },
                onDismiss: onDismiss
            )
        }

        // MARK: - Polishing Progress

        private var polishingProgressView: some View {
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

            return VStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassSpinner(size: .large)
                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .animation(
                        .easeInOut(duration: 0.4), value: polishingStageIndex
                    )
            }
            .onAppear { startPolishingTimer() }
            .onDisappear { stopPolishingTimer() }
        }

        private func startPolishingTimer() {
            polishingStageIndex = 0
            polishingTimer = Timer.scheduledTimer(
                withTimeInterval: 5, repeats: true
            ) { _ in
                Task { @MainActor in polishingStageIndex += 1 }
            }
        }

        private func stopPolishingTimer() {
            polishingTimer?.invalidate()
            polishingTimer = nil
            polishingStageIndex = 0
        }

        private var polishingStageKeys: [String] {
            let base = "player.pauseAsk.stages"
            let generic = ["\(base).polishing", "\(base).thinking"]
            return generic + characterStageKeys(base: base)
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

        // MARK: - Idle

        @FocusState private var idleFocus: IdleFocusButton?

        private var idlePanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if lastResponse != nil {
                        Button {
                            replayLastExchange()
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                Text(localization.t("player.pauseAsk.watchAgain"))
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.md,
                                        weight: .semibold
                                    ))
                            }
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                        }
                        .buttonStyle(.card)
                        .tvFocusStyle()
                        .focused($idleFocus, equals: .replay)
                    }
                    GlassButton(
                        localization.t("player.pauseAsk.askAnother"),
                        variant: .primary, size: .large
                    ) { phase = .input; messageText = "" }
                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .large
                    ) { onDismiss() }
                }
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
                .onAppear { idleFocus = lastResponse != nil ? .replay : nil }
            }
        }

        private func replayLastExchange() {
            guard let response = lastResponse else { return }
            Task { await playResponse(response) }
        }

        // MARK: - Error

        private var errorPanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.ErrorColor.default)

                Text(errorTitle)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(viewModel.lastError ?? localization.t("common.tryAgain"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    GlassButton(
                        localization.t("common.retry"),
                        variant: .primary, size: .large
                    ) { retryLastMessage() }
                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .large
                    ) { onDismiss() }
                }
                Spacer()
            }
        }

        private var errorTitle: String {
            guard let service = viewModel.lastFailedService else {
                return localization.t("player.pauseAsk.error.generic")
            }
            switch service {
            case "anthropic":
                return localization.t("player.pauseAsk.error.anthropic")
            case "fal_ai":
                return localization.t("player.pauseAsk.error.falAi")
            case "elevenlabs":
                return localization.t("player.pauseAsk.error.elevenlabs")
            case "credits":
                return localization.t("player.pauseAsk.error.credits")
            default:
                return localization.t("player.pauseAsk.error.generic")
            }
        }

        private func retryLastMessage() {
            guard !lastFailedMessage.isEmpty else { phase = .input; return }
            messageText = lastFailedMessage
            lastFailedMessage = ""
            sendQuestion()
        }

        // MARK: - Actions

        private func selectCharacter(_ character: ContentCharacter) async {
            if viewModel.sessionId != nil {
                viewModel.selectedCharacter = character; phase = .input; return
            }
            guard let avatarId = avatarId else {
                logger.error("Missing avatarId for session start"); return
            }
            await viewModel.startSession(
                contentId: contentId,
                avatarId: avatarId, character: character,
                currentTimestamp: currentTimestamp
            )
            guard viewModel.sessionId != nil else {
                logger.error("Failed to start tvOS Pause & Ask session"); return
            }
            phase = .input
        }

        func sendQuestion() {
            let text = messageText; messageText = ""; phase = .polishing
            Task {
                guard let response = await viewModel.sendPauseAskMessage(text) else {
                    logger.error("tvOS Pause & Ask returned nil")
                    lastFailedMessage = text
                    phase = .error
                    return
                }
                lastResponse = response
                await playResponse(response)
            }
        }
    }

    private enum IdleFocusButton: Hashable {
        case replay
    }
#endif
