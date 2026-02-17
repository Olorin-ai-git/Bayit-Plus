#if os(tvOS)
import AVFoundation
import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS adaptation of the free-form character dialogue overlay.
/// Larger circles (160pt) for 10-foot UI. Focusable text field and buttons.
struct TVAvatarDialogueOverlayView: View {

    @Environment(LocalizationManager.self) private var localization

    let avatarImageUrl: String
    let character: ContentCharacter
    @Bindable var viewModel: AvatarDialogueViewModel
    let onDismiss: () -> Void

    @State private var messageText = ""
    @State private var characterPlayer: AVPlayer?
    @State private var isCharacterVideoReady = false
    @FocusState private var isInputFocused: Bool

    private let circleSize: CGFloat = 160

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                overlayContent
                    .frame(maxWidth: 520)
                    .padding(.trailing, TVDesignTokens.Spacing.xxl)
                    .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    private var overlayContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            headerRow
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

            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .accessibilityLabel(
                localization.t("player.dialogue.endDialogue")
            )
        }
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
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 16, x: 0, y: 4
        )
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
                VideoPlayer(player: player)
                    .scaledToFill()
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 16, x: 0, y: 4
        )
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
                        : DesignTokens.Glass.bgSubtle
                )
                .clipShape(
                    RoundedRectangle(
                        cornerRadius: TVDesignTokens.Radius.md
                    )
                )
            if exchange.speaker == "character" { Spacer() }
        }
    }

    // MARK: - Input

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
            .background(DesignTokens.Glass.bgSubtle)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
            .disabled(viewModel.isSending)

            GlassButton(
                viewModel.isSending
                    ? localization.t("player.dialogue.sending")
                    : localization.t("common.send"),
                variant: .primary,
                size: .large
            ) {
                sendMessage()
            }
            .disabled(messageText.isEmpty || viewModel.isSending)
        }
    }

    // MARK: - Actions

    private func sendMessage() {
        let text = messageText
        messageText = ""
        cleanupCharacterPlayer()

        Task {
            let response = await viewModel.sendMessage(text)
            if let videoUrl = response?.animatedVideoUrl {
                playCharacterVideo(urlString: videoUrl)
            }
        }
    }

    private func playCharacterVideo(urlString: String) {
        guard let url = URL(string: urlString) else { return }

        let player = AVPlayer(url: url)
        characterPlayer = player

        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in
                isCharacterVideoReady = false
                characterPlayer = nil
            }
        }

        Task {
            try? await Task.sleep(for: .seconds(0.3))
            await MainActor.run {
                withAnimation(.easeIn(duration: 0.3)) {
                    isCharacterVideoReady = true
                }
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
