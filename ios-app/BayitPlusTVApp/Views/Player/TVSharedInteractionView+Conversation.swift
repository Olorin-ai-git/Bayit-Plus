#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Conversation & Input

    extension TVSharedInteractionView {
        var conversationList: some View {
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

        func sharedBubble(
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

        var inputRow: some View {
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

        func sendMessage() {
            let text = messageText
            messageText = ""
            Task { await viewModel.sendMessage(text) }
        }
    }
#endif
