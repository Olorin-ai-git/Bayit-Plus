import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS notification preferences screen with category-based toggles for
/// push notification types adapted for 10-foot UI navigation.
struct TVNotificationSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var newContent = true
    @State private var liveEvents = true
    @State private var recommendations = true
    @State private var appUpdates = true
    @State private var directMessages = true
    @State private var friendActivity = true
    @State private var watchPartyInvitations = true
    @State private var chessActivity = true

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                togglesSection
                footerNote
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "bell.badge")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.notificationPreferences"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.notificationDescription"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Toggles

    private var togglesSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            notificationToggle(
                icon: "film",
                title: localization.t("settings.newContent"),
                subtitle: localization.t("settings.newContentDescription"),
                isOn: $newContent
            )
            notificationToggle(
                icon: "antenna.radiowaves.left.and.right",
                title: localization.t("settings.liveEvents"),
                subtitle: localization.t("settings.liveEventsDescription"),
                isOn: $liveEvents
            )
            notificationToggle(
                icon: "sparkles",
                title: localization.t("settings.recommendations"),
                subtitle: localization.t("settings.recommendationsDescription"),
                isOn: $recommendations
            )
            notificationToggle(
                icon: "arrow.triangle.2.circlepath",
                title: localization.t("settings.appUpdates"),
                subtitle: localization.t("settings.appUpdatesDescription"),
                isOn: $appUpdates
            )
            notificationToggle(
                icon: "message",
                title: localization.t("settings.directMessages"),
                subtitle: localization.t("settings.directMessagesDescription"),
                isOn: $directMessages
            )
            notificationToggle(
                icon: "person.2",
                title: localization.t("settings.friendActivity"),
                subtitle: localization.t("settings.friendActivityDescription"),
                isOn: $friendActivity
            )
            notificationToggle(
                icon: "party.popper",
                title: localization.t("settings.watchPartyInvitations"),
                subtitle: localization.t("settings.watchPartyInvitationsDescription"),
                isOn: $watchPartyInvitations
            )
            notificationToggle(
                icon: "crown",
                title: localization.t("settings.chessActivity"),
                subtitle: localization.t("settings.chessActivityDescription"),
                isOn: $chessActivity
            )
        }
    }

    private func notificationToggle(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: isOn)
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Footer

    private var footerNote: some View {
        Text(localization.t("settings.notificationFooter"))
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
