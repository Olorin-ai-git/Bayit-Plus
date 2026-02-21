#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Overlay for shared interactive sessions in watch parties.
    /// Shows participant avatars, turn indicator, and shared conversation.
    struct SharedInteractionOverlayView: View {
        @Environment(LocalizationManager.self) var localization

        @Bindable var viewModel: SharedInteractionViewModel
        let onDismiss: () -> Void

        @State var messageText = ""

        var body: some View {
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    overlayContent
                        .frame(maxWidth: 400)
                        .padding(.trailing, DesignTokens.Spacing.base)
                        .padding(.bottom, DesignTokens.Spacing.xxl)
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
                    participantRow
                    turnIndicator
                    conversationList
                    if viewModel.isMyTurn { inputRow }
                }
            }
        }

        // MARK: - Header

        private var headerRow: some View {
            HStack {
                Text(viewModel.characterName)
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

        // MARK: - Participants

        private var participantRow: some View {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("player.shared.participants"))
                    .font(.system(size: DesignTokens.FontSize.xs))
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

            return VStack(spacing: 2) {
                CachedAsyncImage(url: URL(string: participant.avatarImageUrl ?? "")) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().scaledToFill()
                    default:
                        Color.gray.opacity(0.3)
                    }
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(
                        isCurrentTurn
                            ? DesignTokens.Primary.default
                            : .clear,
                        lineWidth: 2
                    )
                )

                Text(participant.displayName)
                    .font(.system(size: DesignTokens.FontSize.xs))
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
                            size: DesignTokens.FontSize.sm, weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Primary.default)
                } else {
                    Text(localization.t("player.shared.waitingForTurn"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                if let countdown = viewModel.turnCountdown {
                    Text("\(countdown)")
                        .font(.system(
                            size: DesignTokens.FontSize.md, weight: .bold
                        ))
                        .foregroundStyle(
                            countdown <= 5
                                ? DesignTokens.ErrorColor.default
                                : DesignTokens.Text.secondary
                        )
                }
            }
            .padding(.vertical, DesignTokens.Spacing.xs)
        }
    }
#endif
