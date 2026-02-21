#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Compact floating overlay for free-form character dialogue.
    /// Supports text and voice input, multi-character mode, and dynamic positioning.
    struct AvatarDialogueOverlayView: View {
        @Environment(LocalizationManager.self) private var localization

        let avatarImageUrl: String
        let character: ContentCharacter
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: VoiceInteractionService?
        let avatarPlacement: AvatarPlacement?
        let onDismiss: () -> Void

        @State private var messageText = ""
        @State private var characterPlayer: AVPlayer?
        @State private var isCharacterVideoReady = false
        @State private var inputMode: DialogueInputView.InputMode = .text

        private let circleSize: CGFloat = 100

        var body: some View {
            VStack {
                if positionIsTop { overlayPanel; Spacer() }
                else { Spacer(); overlayPanel }
            }
            .allowsHitTesting(true)
        }

        private var positionIsTop: Bool {
            guard let placement = avatarPlacement else { return false }
            return placement.position.hasPrefix("top")
        }

        private var overlayPanel: some View {
            HStack {
                if positionIsRight { Spacer() }
                overlayContent
                    .frame(maxWidth: 380)
                    .padding(DesignTokens.Spacing.base)
                if !positionIsRight { Spacer() }
            }
        }

        private var positionIsRight: Bool {
            avatarPlacement?.position.hasSuffix("right") ?? true
        }

        private var overlayContent: some View {
            GlassCard(
                radius: DesignTokens.Radius.lg,
                padding: DesignTokens.Spacing.md
            ) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    headerRow
                    if viewModel.isMultiCharacterMode {
                        MultiCharacterCirclesView(
                            characters: viewModel.multiCharacters,
                            addressedCharacter: viewModel.addressedCharacterName,
                            onSelectCharacter: { viewModel.addressedCharacterName = $0 }
                        )
                    }
                    DialogueCirclesView(
                        avatarImageUrl: avatarImageUrl,
                        characterFrameUrl: character.frameUrl,
                        characterPlayer: characterPlayer,
                        isCharacterVideoReady: isCharacterVideoReady,
                        circleSize: circleSize
                    )
                    conversationList
                    inputSection
                }
            }
        }

        // MARK: - Header

        private var headerRow: some View {
            HStack {
                Text(character.name)
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

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
                    .accessibilityLabel(
                        localization.t("player.dialogue.voiceMode")
                    )
                }

                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .accessibilityLabel(
                    localization.t("player.dialogue.endDialogue")
                )
            }
        }

        // MARK: - Conversation

        private var conversationList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    ForEach(viewModel.exchanges.suffix(6)) { exchange in
                        exchangeBubble(exchange)
                    }
                }
            }
            .frame(maxHeight: 100)
        }

        private func exchangeBubble(
            _ exchange: DialogueExchange
        ) -> some View {
            HStack {
                if exchange.speaker == "user" { Spacer() }
                VStack(alignment: .leading, spacing: 2) {
                    if let name = exchange.characterName {
                        Text(name)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                    Text(exchange.messageText)
                        .font(.system(size: exchange.reactionTo != nil
                                ? DesignTokens.FontSize.xs
                                : DesignTokens.FontSize.sm))
                        .foregroundStyle(
                            exchange.speaker == "user"
                                ? DesignTokens.Text.primary
                                : DesignTokens.Primary.p300
                        )
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(
                    exchange.speaker == "user"
                        ? DesignTokens.Glass.bgStrong
                        : DesignTokens.Glass.bgLight
                )
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                if exchange.speaker == "character" { Spacer() }
            }
        }

        // MARK: - Input

        private var inputSection: some View {
            DialogueInputView(
                messageText: $messageText,
                isSending: viewModel.isSending,
                voiceService: voiceService,
                inputMode: inputMode,
                onToggleMode: {
                    inputMode = inputMode == .text ? .voice : .text
                },
                onSend: { sendMessage() }
            )
        }

        // MARK: - Actions

        private func sendMessage() {
            let text = messageText
            messageText = ""
            cleanupCharacterPlayer()

            Task {
                if viewModel.isMultiCharacterMode {
                    let response = await viewModel.sendMultiCharacterMessage(text)
                    if let first = response?.exchanges.first(where: { $0.animatedVideoUrl != nil }),
                       let url = first.animatedVideoUrl
                    {
                        playCharacterVideo(urlString: url)
                    }
                } else {
                    let response = await viewModel.sendMessage(text)
                    if let videoUrl = response?.animatedVideoUrl {
                        playCharacterVideo(urlString: videoUrl)
                    }
                }
            }
        }

        private func playCharacterVideo(urlString: String) {
            guard let url = URL(string: urlString) else { return }
            let player = AVPlayer(url: url)
            characterPlayer = player
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { _ in
                Task { @MainActor in
                    isCharacterVideoReady = false
                    characterPlayer = nil
                }
            }
            Task {
                try? await Task.sleep(for: .seconds(0.3))
                await MainActor.run {
                    withAnimation(.easeIn(duration: 0.3)) { isCharacterVideoReady = true }
                    player.play()
                }
            }
        }

        private func cleanupCharacterPlayer() {
            characterPlayer?.pause()
            characterPlayer = nil
            isCharacterVideoReady = false
        }
    }
#endif
