import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extracted helper subviews from ChessView for the 200-line limit.
extension ChessView {
    func gameCodeChip(_ code: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("chess.gameCode") + ": \(code)")
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
            GlassButton(localization.t("chess.copyCode"), variant: .ghost) {
                UIPasteboard.general.string = code
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    func statusIndicator(_ vm: ChessViewModel) -> some View {
        Group {
            if vm.gameStatus == .active {
                let turn = vm.currentTurn == .white
                    ? localization.t("chess.whiteTurn")
                    : localization.t("chess.blackTurn")
                Text(turn)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Gradient.ctaStart)
            } else {
                Text(statusLabel(vm.gameStatus))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .accessibilityLabel("Game status")
    }

    func statusLabel(_ status: ChessGameStatus) -> String {
        switch status {
        case .checkmate: return localization.t("chess.checkmate")
        case .stalemate: return localization.t("chess.stalemate")
        case .draw: return localization.t("chess.draw")
        case .resigned: return localization.t("chess.resigned")
        case .timeout: return localization.t("chess.timeout")
        default: return localization.t("chess.gameOver")
        }
    }

    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Gradient.ctaStart)
                .scaleEffect(1.2)
            Text(localization.t("chess.waitingForOpponent"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
