import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized friends view with two-column layout:
/// left = search + friend list, right = requests + activity
struct IPadFriendsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        HStack(spacing: 0) {
            friendsPanel
                .frame(maxWidth: .infinity)

            Divider().background(DesignTokens.Glass.border)

            activityPanel
                .frame(maxWidth: .infinity)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Left: Friends List

    private var friendsPanel: some View {
        VStack(spacing: 0) {
            panelHeader(
                icon: "person.2.fill",
                title: localization.t("friends.title")
            )

            FriendsView(repository: repos.friends)
        }
    }

    // MARK: - Right: Activity & Quick Actions

    private var activityPanel: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                panelHeader(
                    icon: "bolt.fill",
                    title: localization.t("social.quickActions")
                )

                quickActionButton(
                    icon: "popcorn.fill",
                    title: localization.t("watchParty.title"),
                    subtitle: localization.t("watchParty.createOrJoin")
                ) {
                    coordinator.navigate(to: .watchParty)
                }

                quickActionButton(
                    icon: "checkerboard.rectangle",
                    title: localization.t("chess.title"),
                    subtitle: localization.t("chess.playWithFriend")
                ) {
                    coordinator.navigate(to: .chess(gameId: nil))
                }

                quickActionButton(
                    icon: "bubble.left.and.bubble.right.fill",
                    title: localization.t("messages.title"),
                    subtitle: localization.t("dm.openConversations")
                ) {
                    coordinator.navigate(to: .directMessages)
                }
            }
            .padding(DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Helpers

    private func panelHeader(icon: String, title: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(DesignTokens.Primary.default)
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func quickActionButton(
        icon: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(DesignTokens.Primary.default)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard()
        }
        .buttonStyle(.plain)
    }
}
