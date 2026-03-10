import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Glass-styled player info bar showing name, color indicator, clock, and connection status.
struct ChessPlayerBar: View {
    @Environment(LocalizationManager.self) private var localization
    let player: ChessPlayer?
    let label: String
    let isCurrentTurn: Bool
    let timeRemainingMs: Int?

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            colorIndicator
            playerName
            Spacer()
            if let ms = timeRemainingMs {
                clockDisplay(ms: ms)
            }
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

    private func clockDisplay(ms: Int) -> some View {
        let totalSeconds = max(0, ms / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        let isLow = totalSeconds <= 30
        let formatted = String(format: "%d:%02d", minutes, seconds)
        return Text(formatted)
            .font(.system(size: DesignTokens.FontSize.base, weight: .bold, design: .monospaced))
            .foregroundStyle(isLow ? DesignTokens.ErrorColor.default : DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(isLow ? DesignTokens.ErrorColor.default.opacity(0.15) : DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            .accessibilityLabel("Time remaining: \(minutes) minutes \(seconds) seconds")
    }

    private var turnBadge: some View {
        Text(localization.t("chess.turn"))
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
