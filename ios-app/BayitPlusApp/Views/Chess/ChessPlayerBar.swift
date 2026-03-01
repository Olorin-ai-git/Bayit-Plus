import BayitDesignSystem
import SwiftUI

/// Glass-styled player info bar showing name, color indicator, and connection status.
struct ChessPlayerBar: View {
    let player: ChessPlayer?
    let label: String
    let isCurrentTurn: Bool

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            colorIndicator
            playerName
            Spacer()
            if isCurrentTurn {
                turnBadge
            }
            if let player {
                OnlineStatusBadge(isOnline: player.isConnected)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    isCurrentTurn ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.borderLight,
                    lineWidth: 1
                )
        )
        .accessibilityElement(children: .combine)
    }

    private var colorIndicator: some View {
        Circle()
            .fill(pieceColor)
            .frame(width: 12, height: 12)
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
    }

    private var playerName: some View {
        Text(player?.userName ?? label)
            .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .lineLimit(1)
    }

    private var turnBadge: some View {
        Text("Turn")
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundStyle(DesignTokens.Background.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(DesignTokens.Gradient.ctaStart)
            .clipShape(Capsule())
    }

    private var pieceColor: Color {
        guard let color = player?.color else { return DesignTokens.Text.muted }
        return color == .white ? DesignTokens.Gradient.ctaStart : DesignTokens.Primary.p500
    }
}
