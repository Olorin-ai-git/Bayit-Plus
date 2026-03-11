import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Stats Grid Section

struct TVProfileStatsSection: View {
    let stats: ProfileStats
    let localization: LocalizationManager

    var body: some View {
        Section {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                ],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                statCard(
                    icon: "play.circle.fill",
                    title: localization.t("profile.watched"),
                    value: "\(stats.totalWatched ?? 0)",
                    color: DesignTokens.Primary.p400
                )

                statCard(
                    icon: "heart.fill",
                    title: localization.t("profile.favorites"),
                    value: "\(stats.totalFavorites ?? 0)",
                    color: DesignTokens.ErrorColor.e400
                )

                statCard(
                    icon: "list.bullet",
                    title: localization.t("profile.playlists"),
                    value: "\(stats.totalPlaylists ?? 0)",
                    color: DesignTokens.Secondary.s400
                )

                if let recordings = stats.totalRecordings, recordings > 0 {
                    statCard(
                        icon: "record.circle",
                        title: localization.t("profile.recordings"),
                        value: "\(recordings)",
                        color: DesignTokens.Warning.default
                    )
                }

                if let streak = stats.streakDays, streak > 0 {
                    statCard(
                        icon: "flame.fill",
                        title: localization.t("profile.dayStreak"),
                        value: "\(streak)",
                        color: DesignTokens.Warning.w500
                    )
                }

                if let watchTime = stats.watchTimeMinutes, watchTime > 0 {
                    let hours = watchTime / 60
                    statCard(
                        icon: "clock.fill",
                        title: localization.t("profile.watchTime"),
                        value: "\(hours)h",
                        color: DesignTokens.Info.default
                    )
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        } header: {
            profileSectionHeader(localization.t("profile.yourStatistics"))
        }
    }

    private func statCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .cornerRadius(TVDesignTokens.Radius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }
}
