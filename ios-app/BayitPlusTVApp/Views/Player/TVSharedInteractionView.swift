#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS shared interaction overlay for watch parties.
    /// Shows participants, turn indicator, and shared conversation.
    /// 10-foot UI with focusable elements for Siri Remote navigation.
    struct TVSharedInteractionView: View {
        @Environment(LocalizationManager.self) var localization

        @Bindable var viewModel: SharedInteractionViewModel
        let onDismiss: () -> Void

        @State var messageText = ""
        @FocusState var isInputFocused: Bool

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
                CachedAsyncImage(
                    url: URL(string: participant.avatarImageUrl ?? "")
                ) { phase in
                    switch phase {
                    case let .success(image):
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
    }
#endif
