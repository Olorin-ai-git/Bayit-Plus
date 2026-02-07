import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Notification preferences screen with category-based toggles for
/// push notification types.
struct NotificationSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var newContent = true
    @State private var liveEvents = true
    @State private var recommendations = true
    @State private var appUpdates = true

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerSection
                togglesSection
                footerNote
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "bell.badge")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.notificationPreferences"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.notificationDescription"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Toggles

    private var togglesSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
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
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func notificationToggle(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }

                Spacer()

                Toggle("", isOn: isOn)
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Footer

    private var footerNote: some View {
        Text(localization.t("settings.notificationFooter"))
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
    }
}
