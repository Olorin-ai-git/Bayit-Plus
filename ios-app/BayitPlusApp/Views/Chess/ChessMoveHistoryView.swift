import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Scrollable move history list displaying algebraic notation move pairs.
struct ChessMoveHistoryView: View {
    let moves: [ChessMove]

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("chess.moveHistory"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(moves) { move in
                            moveEntry(move)
                                .id(move.id)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.xs)
                }
                .onChange(of: moves.count) {
                    if let last = moves.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .trailing) }
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("chess.moveHistory"))
    }

    private func moveEntry(_ move: ChessMove) -> some View {
        HStack(spacing: DesignTokens.Spacing.xxs) {
            Text("\(move.moveNumber).")
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(move.whiteMove)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium, design: .monospaced))
                .foregroundStyle(DesignTokens.Text.primary)

            if let blackMove = move.blackMove {
                Text(blackMove)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium, design: .monospaced))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
