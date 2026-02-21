#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Conversation & Input Sections

    extension SharedInteractionOverlayView {
        var conversationList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    ForEach(viewModel.exchanges.suffix(8)) { exchange in
                        sharedExchangeBubble(exchange)
                    }
                }
            }
            .frame(maxHeight: 120)
        }

        func sharedExchangeBubble(
            _ exchange: DialogueExchange
        ) -> some View {
            HStack {
                if exchange.speaker == "user" { Spacer() }
                VStack(alignment: .leading, spacing: 2) {
                    if let name = exchange.participantName ?? exchange.characterName {
                        Text(name)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                    Text(exchange.messageText)
                        .font(.system(size: DesignTokens.FontSize.sm))
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

        var inputRow: some View {
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
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .disabled(viewModel.isSending)

                GlassButton(
                    viewModel.isSending
                        ? localization.t("player.dialogue.sending")
                        : localization.t("common.send"),
                    variant: .primary, size: .small
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
