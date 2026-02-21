#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Phase-based overlay for the full Pause & Ask interaction.
    /// Movie is paused. User selects a character, asks a question,
    /// then watches their avatar speak followed by the character's response.
    struct PauseAskDialogueOverlayView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(AuthManager.self) private var authManager

        let avatarImageUrl: String
        let avatarId: String?
        let contentId: String
        let currentTimestamp: Double
        let characters: [ContentCharacter]
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: VoiceInteractionService?
        let onDismiss: () -> Void

        @State private var phase: PauseAskPhase = .selecting
        @State private var messageText = ""
        @State private var inputMode: DialogueInputView.InputMode = .text
        @State private var userPlayer: AVPlayer?
        @State private var characterPlayer: AVPlayer?
        @State private var isUserVideoReady = false
        @State private var isCharacterVideoReady = false
        @State private var lastResponse: PauseAskResponse?
        @State private var userEndObserver: NSObjectProtocol?
        @State private var characterEndObserver: NSObjectProtocol?
        @State private var userStatusObserver: NSKeyValueObservation?
        @State private var characterStatusObserver: NSKeyValueObservation?

        private let circleSize: CGFloat = 120
        private let transitionDelay: TimeInterval = 0.5
        private let logger = BayitLogger(category: "PauseAskOverlay")

        var body: some View {
            ZStack {
                Color.black.opacity(0.4).ignoresSafeArea()
                phaseContent
            }
            .animation(.easeInOut(duration: 0.3), value: phase)
        }

        // MARK: - Phase Router

        @ViewBuilder
        private var phaseContent: some View {
            switch phase {
            case .selecting:
                PauseAskCharacterOverlayView(
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
            case .userSpeaking:
                videoPlaybackView(isUserPhase: true)
            case .transition:
                videoPlaybackView(isUserPhase: false)
            case .characterSpeaking:
                videoPlaybackView(isUserPhase: false)
            case .idle:
                idlePanel
            }
        }

        // MARK: - Input Panel

        private var inputPanel: some View {
            VStack {
                Spacer()
                GlassCard(
                    radius: DesignTokens.Radius.lg,
                    padding: DesignTokens.Spacing.md
                ) {
                    VStack(spacing: DesignTokens.Spacing.md) {
                        inputHeader
                        DialogueInputView(
                            messageText: $messageText,
                            isSending: viewModel.isSending,
                            voiceService: voiceService,
                            inputMode: inputMode,
                            onToggleMode: {
                                inputMode = inputMode == .text ? .voice : .text
                            },
                            onSend: { sendQuestion() }
                        )
                    }
                }
                .frame(maxWidth: 400)
                .padding(DesignTokens.Spacing.lg)
            }
        }

        private var inputHeader: some View {
            HStack {
                if let name = viewModel.selectedCharacter?.name {
                    Text(name)
                        .font(.system(
                            size: DesignTokens.FontSize.md, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                Spacer()

                if voiceService != nil {
                    Button {
                        inputMode = inputMode == .text ? .voice : .text
                    } label: {
                        Image(systemName: inputMode == .voice
                            ? "keyboard" : "mic.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }

        // MARK: - Progress

        private func progressView(_ text: String) -> some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                Text(text)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        // MARK: - Video Playback

        private func videoPlaybackView(isUserPhase _: Bool) -> some View {
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

        private var userCircle: some View {
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

        private var characterCircle: some View {
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

        private func stillImage(url: String) -> some View {
            AsyncImage(url: URL(string: url)) { imgPhase in
                switch imgPhase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    Color.black
                }
            }
        }

        // MARK: - Idle Panel

        private var idlePanel: some View {
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

        // MARK: - Actions

        private func selectCharacter(_ character: ContentCharacter) async {
            if viewModel.sessionId != nil {
                viewModel.selectedCharacter = character
                phase = .input
                return
            }
            guard let profileId = authManager.activeProfile?.id,
                  let avatarId = avatarId
            else {
                logger.error("Missing profileId or avatarId for session start")
                return
            }
            await viewModel.startSession(
                contentId: contentId,
                profileId: profileId,
                avatarId: avatarId,
                character: character,
                currentTimestamp: currentTimestamp
            )
            guard viewModel.sessionId != nil else {
                logger.error("Failed to start Pause & Ask session")
                return
            }
            phase = .input
        }

        private func sendQuestion() {
            let text = messageText
            messageText = ""
            phase = .polishing

            Task {
                let response = await viewModel.sendPauseAskMessage(text)
                guard let response else {
                    logger.error("Pause & Ask returned nil response")
                    phase = .input
                    return
                }
                lastResponse = response
                await playUserVideo(response)
            }
        }

        private func playUserVideo(_ response: PauseAskResponse) async {
            guard !response.userAnimatedVideoUrl.isEmpty,
                  let url = URL(string: response.userAnimatedVideoUrl)
            else {
                await playCharacterVideo(response)
                return
            }

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
                    try? await Task.sleep(for: .seconds(transitionDelay))
                    await playCharacterVideo(response)
                }
            }

            guard let item = player.currentItem else {
                logger.error("User player has no current item")
                await playCharacterVideo(response)
                return
            }

            userStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation(.easeIn(duration: 0.3)) {
                            isUserVideoReady = true
                        }
                        player?.play()
                    case .failed:
                        logger.error(
                            "User video failed to load: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupUserPlayer()
                        await playCharacterVideo(response)
                    default:
                        break
                    }
                }
            }
        }

        private func playCharacterVideo(_ response: PauseAskResponse) async {
            guard let url = URL(string: response.characterAnimatedVideoUrl) else {
                phase = .idle
                return
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
                        withAnimation(.easeIn(duration: 0.3)) {
                            isCharacterVideoReady = true
                        }
                        player?.play()
                    case .failed:
                        logger.error(
                            "Character video failed to load: "
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
