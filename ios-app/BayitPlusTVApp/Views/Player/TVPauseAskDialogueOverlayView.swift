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
        @Environment(LocalizationManager.self) var localization
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
        @FocusState var idleFocus: IdleFocusButton?

        let logger = BayitLogger(category: "TVPauseAskOverlay")

        var body: some View {
            ZStack {
                DesignTokens.Glass.bgStrong.ignoresSafeArea()
                phaseContent
            }
            .animation(.easeInOut(duration: 0.3), value: phase)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(localization.t("player.pauseAsk.title"))
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

    enum IdleFocusButton: Hashable {
        case replay
    }
#endif
