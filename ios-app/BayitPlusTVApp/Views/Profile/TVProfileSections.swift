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

// MARK: - Beta Section

struct TVProfileBetaSection: View {
    let profile: ProfileResponse
    let localization: LocalizationManager

    var body: some View {
        Section {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "testtube.2")
                    .font(.system(size: 48))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("profile.beta500Member"))
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("profile.beta500Description"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text("\(profile.betaCredits ?? 0)")
                        .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("profile.credits"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400.opacity(0.5), DesignTokens.Secondary.s400.opacity(0.5)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
            )
        }
    }
}
