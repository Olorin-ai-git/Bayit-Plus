import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct LeaderboardRowCard: View {
    @Environment(LocalizationManager.self) private var localization

    let user: LeaderboardUser

    var body: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                positionBadge

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(user.displayName)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    statsRow
                }

                Spacer()

                if user.isCurrentUser {
                    GlassBadge(text: localization.t("leaderboard.you"), variant: .primary)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    user.isCurrentUser ? DesignTokens.Primary.default : Color.clear,
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var positionBadge: some View {
        let (bgColor, textColor) = badgeColors

        return Text("#\(user.position)")
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(textColor)
            .frame(width: 40, height: 40)
            .background(bgColor)
            .clipShape(Circle())
    }

    private var statsRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text("\(user.points)")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            if user.streakDays > 0 {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(DesignTokens.ErrorColor.default)

                    Text("\(user.streakDays)")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }
    }

    private var badgeColors: (Color, Color) {
        switch user.position {
        case 1: return (DesignTokens.Warning.default, DesignTokens.Text.primary)
        case 2: return (DesignTokens.Text.muted, DesignTokens.Text.primary)
        case 3: return (DesignTokens.ErrorColor.e700, DesignTokens.Text.primary)
        default: return (DesignTokens.Glass.bgMedium, DesignTokens.Text.secondary)
        }
    }
}
