#if os(tvOS)
import AVFoundation
import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS adaptation of the free-form character dialogue overlay.
/// Larger circles (160pt) for 10-foot UI. Supports voice via Siri Remote
/// and multi-character interactions with focusable navigation.
struct TVAvatarDialogueOverlayView: View {

    @Environment(LocalizationManager.self) private var localization

    let avatarImageUrl: String
    let character: ContentCharacter
    @Bindable var viewModel: AvatarDialogueViewModel
    let voiceService: TVVoiceInteractionService?
    let avatarPlacement: AvatarPlacement?
    let onDismiss: () -> Void

    @State private var messageText = ""
    @State private var characterPlayer: AVPlayer?
    @State private var isCharacterVideoReady = false
    @FocusState private var isInputFocused: Bool

    private let circleSize: CGFloat = 160

    var body: some View {
        VStack {
            if positionIsTop { overlayPanel; Spacer() }
            else { Spacer(); overlayPanel }
        }
    }

    private var positionIsTop: Bool {
        avatarPlacement?.position.hasPrefix("top") ?? false
    }

    private var overlayPanel: some View {
        HStack {
            if positionIsRight { Spacer() }
            overlayContent
                .frame(maxWidth: 520)
                .padding(TVDesignTokens.Spacing.xxl)
            if !positionIsRight { Spacer() }
        }
    }

    private var positionIsRight: Bool {
        avatarPlacement?.position.hasSuffix("right") ?? true
    }

    private var overlayContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            headerRow
            if viewModel.isMultiCharacterMode {
                TVMultiCharacterCirclesView(
                    characters: viewModel.multiCharacters,
                    addressedCharacter: viewModel.addressedCharacterName,
                    onSelectCharacter: { viewModel.addressedCharacterName = $0 }
                )
            }
            circlesRow
            conversationList
            inputRow
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
        )
    }

    // MARK: - Header

    private var headerRow: some View {
        HStack {
            Text(character.name)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg, weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            if let service = voiceService {
                voiceButton(service)
            }
            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .accessibilityLabel(
                localization.t("player.dialogue.endDialogue")
            )
        }
    }

    private func voiceButton(
        _ service: TVVoiceInteractionService
    ) -> some View {
        Button {
            if service.isListening {
                Task {
                    guard let sessionId = viewModel.sessionId else { return }
                    let response = await service.stopListeningAndSend(
                        sessionId: sessionId
                    )
                    if let videoUrl = response?.animatedVideoUrl {
                        playCharacterVideo(urlString: videoUrl)
                    }
                }
            } else {
                service.startListening()
            }
        } label: {
            Image(systemName: service.isListening
                ? "mic.fill" : "mic")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(service.isListening
                    ? DesignTokens.ErrorColor.default
                    : DesignTokens.Text.secondary)
        }
        .accessibilityLabel(
            localization.t("player.dialogue.voiceMode")
        )
    }

    // MARK: - Circles

    private var circlesRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            Spacer()
            avatarCircle
            characterCircle
            Spacer()
        }
    }

    private var avatarCircle: some View {
        AsyncImage(url: URL(string: avatarImageUrl)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Color.gray.opacity(0.3)
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
    }

    private var characterCircle: some View {
        ZStack {
            AsyncImage(url: URL(string: character.frameUrl)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Color.gray.opacity(0.3)
                }
            }
            if isCharacterVideoReady, let player = characterPlayer {
                VideoPlayer(player: player).scaledToFill()
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
    }

    // MARK: - Conversation

    private var conversationList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                ForEach(viewModel.exchanges.suffix(4)) { exchange in
                    exchangeBubble(exchange)
                }
            }
        }
        .frame(maxHeight: 140)
    }

    private func exchangeBubble(
        _ exchange: DialogueExchange
    ) -> some View {
        HStack {
            if exchange.speaker == "user" { Spacer() }
            Text(exchange.messageText)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(
                    exchange.speaker == "user"
                        ? DesignTokens.Text.primary
                        : DesignTokens.Primary.p300
                )
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    exchange.speaker == "user"
                        ? DesignTokens.Glass.bgStrong
                        : DesignTokens.Glass.bgLight
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            if exchange.speaker == "character" { Spacer() }
        }
    }

    // MARK: - Input & Actions

    private var inputRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            TextField(
                localization.t("player.dialogue.typeQuestion"),
                text: $messageText
            )
            .focused($isInputFocused)
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.md))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .disabled(viewModel.isSending)

            GlassButton(
                viewModel.isSending
                    ? localization.t("player.dialogue.sending")
                    : localization.t("common.send"),
                variant: .primary, size: .large
            ) { sendMessage() }
            .disabled(messageText.isEmpty || viewModel.isSending)
        }
    }

    private func sendMessage() {
        let text = messageText
        messageText = ""
        cleanupCharacterPlayer()
        Task {
            if viewModel.isMultiCharacterMode {
                let response = await viewModel.sendMultiCharacterMessage(text)
                if let first = response?.exchanges.first(where: { $0.animatedVideoUrl != nil }),
                   let url = first.animatedVideoUrl {
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
