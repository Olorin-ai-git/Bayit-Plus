#if os(iOS)
import AVFoundation
import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Compact floating overlay for free-form character dialogue.
/// Shows avatar circle (left) and character circle (right) with
/// a text input below. Character video plays inline when response arrives.
struct AvatarDialogueOverlayView: View {

    @Environment(LocalizationManager.self) private var localization

    let avatarImageUrl: String
    let character: ContentCharacter
    @Bindable var viewModel: AvatarDialogueViewModel
    let onDismiss: () -> Void

    @State private var messageText = ""
    @State private var characterPlayer: AVPlayer?
    @State private var isCharacterVideoReady = false

    private let circleSize: CGFloat = 100

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                overlayContent
                    .frame(maxWidth: 380)
                    .padding(.trailing, DesignTokens.Spacing.base)
                    .padding(.bottom, 100)
            }
        }
        .allowsHitTesting(true)
    }

    private var overlayContent: some View {
        GlassCard(
            radius: DesignTokens.Radius.lg,
            padding: DesignTokens.Spacing.md
        ) {
            VStack(spacing: DesignTokens.Spacing.md) {
                headerRow
                circlesRow
                conversationList
                inputRow
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

    // MARK: - Circles

    private var circlesRow: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
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
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 8, x: 0, y: 2
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
                    .scaleEffect(2)
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 8, x: 0, y: 2
        )
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
            Text(exchange.messageText)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(
                    exchange.speaker == "user"
                        ? DesignTokens.Text.primary
                        : DesignTokens.Primary.p300
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(
                    exchange.speaker == "user"
                        ? DesignTokens.Glass.bgStrong
                        : DesignTokens.Glass.bgSubtle
                )
                .clipShape(
                    RoundedRectangle(
                        cornerRadius: DesignTokens.Radius.md
                    )
                )
            if exchange.speaker == "character" { Spacer() }
        }
    }

    // MARK: - Input

    private var inputRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            TextField(
                localization.t("player.dialogue.typeQuestion"),
                text: $messageText
            )
            .textFieldStyle(.plain)
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.bgSubtle)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .disabled(viewModel.isSending)

            GlassButton(
                viewModel.isSending
                    ? localization.t("player.dialogue.sending")
                    : localization.t("common.send"),
                variant: .primary,
                size: .small
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
