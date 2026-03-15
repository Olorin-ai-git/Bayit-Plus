import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Center Column: My Content 2x2 Grid

extension TVProfileView {
    var centerColumn: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("profile.myContent"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md),
                ],
                spacing: TVDesignTokens.Spacing.md
            ) {
                contentGridButton(
                    icon: "heart.fill",
                    title: localization.t("profile.favorites"),
                    color: DesignTokens.ErrorColor.e400
                ) { activeSheet = .favorites }

                contentGridButton(
                    icon: "play.rectangle.fill",
                    title: localization.t("profile.recordings"),
                    color: DesignTokens.Primary.p400
                ) { activeSheet = .recordings }

                contentGridButton(
                    icon: "list.bullet",
                    title: localization.t("profile.playlists"),
                    color: DesignTokens.Secondary.s400
                ) { activeSheet = .watchlist }

                contentGridButton(
                    icon: "clock.arrow.circlepath",
                    title: localization.t("profile.history"),
                    color: DesignTokens.Info.default
                ) { activeSheet = .viewingHistory }
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private func contentGridButton(
        icon: String,
        title: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .tvCardStyle()
    }

    // MARK: - Right Column: Social + Settings

    var rightColumn: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            socialPanel
            settingsPanel
        }
    }

    private var socialPanel: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("profile.social"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            panelRow(
                icon: "person.2.fill",
                title: localization.t("nav.friends"),
                color: DesignTokens.Primary.p400,
                badge: friendsVM?.incomingRequests.count
            ) { activeSheet = .friends }

            panelRow(
                icon: "bubble.left.and.bubble.right",
                title: localization.t("profile.messages"),
                color: DesignTokens.Info.default,
                badge: messagesVM?.totalUnreadCount
            ) { activeSheet = .messages }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private var settingsPanel: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("nav.settings"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            panelRow(
                icon: "gearshape.fill",
                title: localization.t("profile.preferences"),
                color: DesignTokens.Primary.p400
            ) { activeSheet = .preferences }

            panelRow(
                icon: "lock.fill",
                title: localization.t("profile.accountSecurity"),
                color: DesignTokens.Warning.default
            ) { activeSheet = .accountSettings }

            panelRow(
                icon: "gear",
                title: localization.t("profile.appSettings"),
                color: DesignTokens.Text.secondary
            ) { activeSheet = .settings }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private func panelRow(
        icon: String,
        title: String,
        color: Color,
        badge: Int? = nil,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(color)
                    .frame(width: 32)
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                Spacer()
                if let badge, badge > 0 {
                    Text("\(badge)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(DesignTokens.Primary.default)
                        .clipShape(Circle())
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.vertical, TVDesignTokens.Spacing.xs)
        }
        .tvCardStyle()
    }
}
