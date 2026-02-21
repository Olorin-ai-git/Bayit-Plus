#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - TVAvatarDialogueOverlayView + Conversation & Circles

    extension TVAvatarDialogueOverlayView {
        // MARK: - Circles

        var circlesRow: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                Spacer()
                avatarCircle
                characterCircle
                Spacer()
            }
        }

        var avatarCircle: some View {
            CachedAsyncImage(url: URL(string: avatarImageUrl)) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    Color.gray.opacity(0.3)
                }
            }
            .frame(width: circleSize, height: circleSize)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 3))
        }

        var characterCircle: some View {
            ZStack {
                CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                    switch phase {
                    case let .success(image):
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

        var conversationList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    ForEach(viewModel.exchanges.suffix(4)) { exchange in
                        exchangeBubble(exchange)
                    }
                }
            }
            .frame(maxHeight: 140)
        }

        func exchangeBubble(
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

        // MARK: - Input

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
    }
#endif
