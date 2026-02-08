import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Game control buttons for resign and draw offer during a chess match.
struct ChessControlsView: View {
    let gameStatus: ChessGameStatus
    let drawOffered: Bool
    let onResign: () -> Void
    let onOfferDraw: () -> Void
    let onAcceptDraw: () -> Void
    let onDeclineDraw: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if drawOffered {
                drawResponseButtons
            } else if gameStatus == .active {
                activeGameButtons
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    // MARK: - Subviews

    private var activeGameButtons: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("chess.resign"),
                variant: .destructive,
                size: .medium,
                icon: Image(systemName: "flag.fill"),
                action: onResign
            )
            .accessibilityLabel(localization.t("chess.resign"))

            GlassButton(
                localization.t("chess.offerDraw"),
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "handshake.fill"),
                action: onOfferDraw
            )
            .accessibilityLabel(localization.t("chess.offerDraw"))
        }
    }

    private var drawResponseButtons: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("chess.drawOffered"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.md) {
                GlassButton(
                    localization.t("chess.acceptDraw"),
                    variant: .primary,
                    size: .small,
                    action: onAcceptDraw
                )
                .accessibilityLabel(localization.t("chess.acceptDraw"))

                GlassButton(
                    localization.t("chess.declineDraw"),
                    variant: .secondary,
                    size: .small,
                    action: onDeclineDraw
                )
                .accessibilityLabel(localization.t("chess.declineDraw"))
            }
        }
    }
}
