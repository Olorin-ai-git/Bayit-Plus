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

        @State private var phase: PauseAskPhase = .selecting
        @State private var messageText = ""
        @State private var userPlayer: AVPlayer?
        @State private var characterPlayer: AVPlayer?
        @State private var isUserVideoReady = false
        @State private var isCharacterVideoReady = false
        @State private var lastResponse: PauseAskResponse?
        @State private var userEndObserver: NSObjectProtocol?
        @State private var characterEndObserver: NSObjectProtocol?
        @State private var userStatusObserver: NSKeyValueObservation?
        @State private var characterStatusObserver: NSKeyValueObservation?

        private let logger = BayitLogger(category: "TVPauseAskOverlay")

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
                progressView(localization.t("player.pauseAsk.processing"))
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

        // MARK: - Progress & Idle

        private func progressView(_ text: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                Text(text).font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var idlePanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Button(localization.t("player.pauseAsk.askAnother")) {
                        phase = .input; messageText = ""
                    }.buttonStyle(.card)
                    Button(localization.t("player.pauseAsk.resumeMovie")) {
                        onDismiss()
                    }.buttonStyle(.card)
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

        private func sendQuestion() {
            let text = messageText; messageText = ""; phase = .polishing
            Task {
                guard let response = await viewModel.sendPauseAskMessage(text) else {
                    logger.error("tvOS Pause & Ask returned nil"); phase = .input; return
                }
                lastResponse = response
                await playResponse(response)
            }
        }

        private func playResponse(_ response: PauseAskResponse) async {
            guard !response.userAnimatedVideoUrl.isEmpty,
                  let url = URL(string: response.userAnimatedVideoUrl)
            else { await playCharacter(response); return }

            cleanupUserPlayer()
            let player = AVPlayer(url: url)
            player.automaticallyWaitsToMinimizeStalling = true
            userPlayer = player
            phase = .userSpeaking

            userEndObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { [weak player] _ in
                guard player != nil else { return }
                Task { @MainActor in
                    cleanupUserPlayer()
                    phase = .transition
                    try? await Task.sleep(for: .seconds(0.5))
                    await playCharacter(response)
                }
            }

            guard let item = player.currentItem else {
                logger.error("User player has no current item")
                await playCharacter(response)
                return
            }

            userStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation { isUserVideoReady = true }
                        player?.play()
                    case .failed:
                        logger.error(
                            "tvOS user video failed: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupUserPlayer()
                        await playCharacter(response)
                    default:
                        break
                    }
                }
            }
        }

        private func playCharacter(_ response: PauseAskResponse) async {
            guard let url = URL(string: response.characterAnimatedVideoUrl) else {
                phase = .idle; return
            }

            cleanupCharacterPlayer()
            let player = AVPlayer(url: url)
            player.automaticallyWaitsToMinimizeStalling = true
            characterPlayer = player
            phase = .characterSpeaking

            characterEndObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { [weak player] _ in
                guard player != nil else { return }
                Task { @MainActor in
                    cleanupCharacterPlayer()
                    phase = .idle
                }
            }

            guard let item = player.currentItem else {
                logger.error("Character player has no current item")
                phase = .idle
                return
            }

            characterStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation { isCharacterVideoReady = true }
                        player?.play()
                    case .failed:
                        logger.error(
                            "tvOS character video failed: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupCharacterPlayer()
                        phase = .idle
                    default:
                        break
                    }
                }
            }
        }

        private func cleanupUserPlayer() {
            if let obs = userEndObserver {
                NotificationCenter.default.removeObserver(obs)
                userEndObserver = nil
            }
            userStatusObserver?.invalidate()
            userStatusObserver = nil
            userPlayer?.pause()
            userPlayer = nil
            isUserVideoReady = false
        }

        private func cleanupCharacterPlayer() {
            if let obs = characterEndObserver {
                NotificationCenter.default.removeObserver(obs)
                characterEndObserver = nil
            }
            characterStatusObserver?.invalidate()
            characterStatusObserver = nil
            characterPlayer?.pause()
            characterPlayer = nil
            isCharacterVideoReady = false
        }
    }
#endif
