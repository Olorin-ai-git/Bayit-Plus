import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized missions dashboard with two-column layout:
/// left = level + daily missions, right = leaderboard + rewards
struct IPadMissionsDashboardView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var profileId: String?

    var body: some View {
        Group {
            if let profileId {
                HStack(alignment: .top, spacing: 0) {
                    missionsPanel(profileId: profileId)
                        .frame(maxWidth: .infinity)

                    Divider().background(DesignTokens.Glass.border)

                    rewardsPanel
                        .frame(maxWidth: .infinity)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .task { await loadProfileId() }
    }

    // MARK: - Left: Missions

    private func missionsPanel(profileId: String) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                panelHeader(icon: "target", title: localization.t("missions.title"))
                MissionsDashboardView(profileId: profileId)
                DailyMissionsView()
            }
            .padding(DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Right: Rewards & Leaderboard

    private var rewardsPanel: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                panelHeader(icon: "trophy", title: localization.t("rewards.title"))

                Button {
                    coordinator.navigate(to: .rewards)
                } label: {
                    HStack {
                        Image(systemName: "trophy.fill")
                            .foregroundColor(DesignTokens.Primary.default)
                        Text(localization.t("rewards.viewAll"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundColor(DesignTokens.Text.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    .padding(DesignTokens.Spacing.md)
                    .glassCard()
                }
                .buttonStyle(.plain)

                panelHeader(icon: "chart.bar", title: localization.t("leaderboard.title"))
                MissionsLeaderboardView()

                panelHeader(icon: "shekel.sign", title: localization.t("shekels.title"))
                ShekelsWalletView()

                panelHeader(icon: "storefront", title: localization.t("coupons.title"))
                CouponShopView()
            }
            .padding(DesignTokens.Spacing.xl)
        }
    }

    private func panelHeader(icon: String, title: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(DesignTokens.Primary.default)
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
        }
    }

    private func loadProfileId() async {
        guard let profile = try? await repos.user.fetchProfile() else { return }
        profileId = profile.id
    }
}
