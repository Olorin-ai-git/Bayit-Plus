import BayitDesignSystem
import SwiftUI

/// Scrollable horizontal move history list for tvOS chess.
/// Displays algebraic notation move pairs scaled for 10-foot UI.
struct TVChessMoveHistoryView: View {
    let moves: [ChessMove]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text("Move History")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(moves) { move in
                            moveEntry(move)
                                .id(move.id)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.sm)
                }
                .onChange(of: moves.count) {
                    if let last = moves.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .trailing) }
                    }
                }
            }
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Move History")
    }

    private func moveEntry(_ move: ChessMove) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Text("\(move.moveNumber).")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(move.whiteMove)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium, design: .monospaced))
                .foregroundStyle(DesignTokens.Text.primary)

            if let blackMove = move.blackMove {
                Text(blackMove)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium, design: .monospaced))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
