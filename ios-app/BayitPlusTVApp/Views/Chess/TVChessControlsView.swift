import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Game control buttons for resign and draw offer during a tvOS chess match.
struct TVChessControlsView: View {
    @Environment(LocalizationManager.self) private var localization

    let gameStatus: ChessGameStatus
    let drawOffered: Bool
    let onResign: () -> Void
    let onOfferDraw: () -> Void
    let onAcceptDraw: () -> Void
    let onDeclineDraw: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if drawOffered {
                drawResponseButtons
            } else if gameStatus == .active {
                activeGameButtons
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Subviews

    private var activeGameButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                "Resign",
                variant: .destructive,
                size: .medium,
                icon: Image(systemName: "flag.fill"),
                action: onResign
            )
            .tvFocusStyle()
            .accessibilityLabel("Resign game")

            GlassButton(
                "Offer Draw",
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "handshake.fill"),
                action: onOfferDraw
            )
            .tvFocusStyle()
            .accessibilityLabel("Offer a draw")
        }
    }

    private var drawResponseButtons: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("chess.drawOffered"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassButton(
                    "Accept Draw",
                    variant: .primary,
                    size: .medium,
                    action: onAcceptDraw
                )
                .tvFocusStyle()
                .accessibilityLabel("Accept draw offer")

                GlassButton(
                    "Decline Draw",
                    variant: .secondary,
                    size: .medium,
                    action: onDeclineDraw
                )
                .tvFocusStyle()
                .accessibilityLabel("Decline draw offer")
            }
        }
    }
}
