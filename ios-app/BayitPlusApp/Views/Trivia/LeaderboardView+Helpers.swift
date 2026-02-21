import BayitDesignSystem
import SwiftUI

/// Extension on LeaderboardView providing rank, medal, and stats helper views.
extension LeaderboardView {
    // MARK: - Rank View

    func rankView(_ rank: Int) -> some View {
        ZStack {
            Circle()
                .fill(rankBackground(for: rank))
                .frame(width: 40, height: 40)

            if rank <= 3 {
                Image(systemName: medalIcon(for: rank))
                    .font(.system(size: 20))
                    .foregroundStyle(medalColor(for: rank))
            } else {
                Text("\(rank)")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
    }

    func rankBackground(for rank: Int) -> Color {
        if rank <= 3 {
            return medalColor(for: rank).opacity(0.2)
        }
        return DesignTokens.Glass.bg
    }

    func medalIcon(for rank: Int) -> String {
        switch rank {
        case 1: return "1.circle.fill"
        case 2: return "2.circle.fill"
        case 3: return "3.circle.fill"
        default: return "circle"
        }
    }

    func medalColor(for rank: Int) -> Color {
        switch rank {
        case 1: return DesignTokens.gold // Gold
        case 2: return Color.gray // Silver
        case 3: return Color.orange.opacity(0.7) // Bronze
        default: return DesignTokens.Text.muted
        }
    }

    func topThreeAccent(for rank: Int) -> Color {
        if rank <= 3 {
            return medalColor(for: rank)
        }
        return .clear
    }

    // MARK: - Stats View

    func statsView(icon: String, value: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
