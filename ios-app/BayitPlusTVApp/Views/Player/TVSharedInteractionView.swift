#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS shared interaction overlay for watch parties.
/// Shows participants, turn indicator, and shared conversation.
/// 10-foot UI with focusable elements for Siri Remote navigation.
struct TVSharedInteractionView: View {

    @Environment(LocalizationManager.self) private var localization

    @Bindable var viewModel: SharedInteractionViewModel
    let onDismiss: () -> Void

    @State private var messageText = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                overlayContent
                    .frame(maxWidth: 580)
                    .padding(TVDesignTokens.Spacing.xxl)
            }
        }
    }

    private var overlayContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            headerRow
            participantRow
            turnIndicator
            conversationList
            if viewModel.isMyTurn { inputRow }
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
            Text(viewModel.characterName)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg, weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

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

    // MARK: - Participants

    private var participantRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("player.shared.participants"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            ForEach(viewModel.participants) { participant in
                participantAvatar(participant)
            }
            Spacer()
        }
    }

    private func participantAvatar(
        _ participant: SharedParticipant
    ) -> some View {
        let isCurrentTurn = participant.userId == viewModel.currentTurnUserId

        return VStack(spacing: TVDesignTokens.Spacing.xs) {
            AsyncImage(
                url: URL(string: participant.avatarImageUrl ?? "")
            ) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Color.gray.opacity(0.3)
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(Circle())
            .overlay(
                Circle().stroke(
                    isCurrentTurn
                        ? DesignTokens.Primary.default
                        : .clear,
                    lineWidth: 3
                )
            )

            Text(participant.displayName)
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .lineLimit(1)
        }
    }

    // MARK: - Turn Indicator

    private var turnIndicator: some View {
        HStack {
            if viewModel.isMyTurn {
                Text(localization.t("player.shared.yourTurn"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.md, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Primary.default)
            } else {
                Text(localization.t("player.shared.waitingForTurn"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()

            if let countdown = viewModel.turnCountdown {
                Text("\(countdown)")
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .bold
                    ))
                    .foregroundStyle(
                        countdown <= 5
                            ? DesignTokens.ErrorColor.default
                            : DesignTokens.Text.secondary
                    )
            }
        }
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    // MARK: - Conversation

    private var conversationList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(
                alignment: .leading,
                spacing: TVDesignTokens.Spacing.sm
            ) {
                ForEach(viewModel.exchanges.suffix(6)) { exchange in
                    sharedBubble(exchange)
                }
            }
        }
        .frame(maxHeight: 160)
    }

    private func sharedBubble(
        _ exchange: DialogueExchange
    ) -> some View {
        HStack {
            if exchange.speaker == "user" { Spacer() }
            VStack(alignment: .leading, spacing: 2) {
                if let name = exchange.participantName ?? exchange.characterName {
                    Text(name)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Text(exchange.messageText)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(
                        exchange.speaker == "user"
                            ? DesignTokens.Text.primary
                            : DesignTokens.Primary.p300
                    )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(
                exchange.speaker == "user"
                    ? DesignTokens.Glass.bgStrong
                    : DesignTokens.Glass.bgLight
            )
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
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
            .background(DesignTokens.Glass.bgLight)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
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
        Task { await viewModel.sendMessage(text) }
    }
}
#endif
