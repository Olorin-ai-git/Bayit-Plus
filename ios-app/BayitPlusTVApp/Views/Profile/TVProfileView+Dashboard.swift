import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - 3-Column Dashboard Layout

extension TVProfileView {
    func dashboardView(profile: ProfileResponse, stats: ProfileStats?) -> some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.lg) {
            leftColumn(profile: profile, stats: stats)
                .frame(width: 300)
            centerColumn
                .frame(minWidth: 520, maxWidth: .infinity)
            rightColumn
                .frame(width: 360)
        }
        .padding(.horizontal, 60)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    // MARK: - Left Column: Avatar + Name + Badge + Stats

    private func leftColumn(profile: ProfileResponse, stats _: ProfileStats?) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            profileAvatar(profile)
                .frame(width: 180, height: 180)

            Text(profile.displayName ?? localization.t("common.guest"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            premiumBadge
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private func profileAvatar(_ profile: ProfileResponse) -> some View {
        Group {
            if let avatarURL = profile.avatar, let url = URL(string: avatarURL) {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        avatarFallback(profile)
                    }
                }
            } else {
                avatarFallback(profile)
            }
        }
        .clipShape(Circle())
        .overlay(
            Circle()
                .strokeBorder(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 4
                )
        )
        .shadow(color: DesignTokens.Glass.purpleGlow.opacity(0.4), radius: 16)
    }

    private func avatarFallback(_ profile: ProfileResponse) -> some View {
        ZStack {
            Circle().fill(
                LinearGradient(
                    colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            Text(String((profile.displayName ?? "?").prefix(1)).uppercased())
                .font(.system(size: 64, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private var premiumBadge: some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: TVDesignTokens.FontSize.sm))
            Text(localization.t("profile.premium"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.xs)
        .background(DesignTokens.Primary.default)
        .clipShape(Capsule())
    }

    private func statsRow(_ stats: ProfileStats) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            statItem(
                icon: "heart.fill",
                value: "\(stats.totalFavorites ?? 0)",
                label: localization.t("profile.favorites"),
                color: DesignTokens.Primary.p400
            )
            statItem(
                icon: "record.circle",
                value: "\(stats.totalRecordings ?? 0)",
                label: localization.t("profile.recordings"),
                color: DesignTokens.Primary.p400
            )
            if let minutes = stats.watchTimeMinutes, minutes > 0 {
                statItem(
                    icon: "clock.fill",
                    value: "\(minutes / 60)h",
                    label: localization.t("profile.watchTime"),
                    color: DesignTokens.Primary.p400
                )
            }
        }
        .padding(.top, TVDesignTokens.Spacing.sm)
    }

    private func statItem(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(color)
                Text(value)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
