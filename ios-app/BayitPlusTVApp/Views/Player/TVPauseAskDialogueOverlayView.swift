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

        private var idlePanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    GlassButton(
                        localization.t("player.pauseAsk.askAnother"),
                        variant: .primary, size: .large
                    ) { phase = .input; messageText = "" }
                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .large
                    ) { onDismiss() }
                }.padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
        }

        // MARK: - Actions

        private func selectCharacter(_ character: ContentCharacter) async {
            if viewModel.sessionId != nil {
                viewModel.selectedCharacter = character; phase = .input; return
            }
            guard let profileId = authManager.activeProfile?.id,
                  let avatarId = avatarId
            else {
                logger.error("Missing profileId or avatarId for session start"); return
            }
            await viewModel.startSession(
                contentId: contentId, profileId: profileId,
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
                    logger.error("tvOS Pause & Ask returned nil"); phase = .input; return
                }
                lastResponse = response
                await playResponse(response)
            }
        }
    }
#endif
