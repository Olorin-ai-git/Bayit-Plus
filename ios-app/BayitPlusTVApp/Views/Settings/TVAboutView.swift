import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS About screen: app version, build info, device info,
/// legal links (privacy policy, terms, cookie policy), and debug info.
struct TVAboutView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                appInfoSection
                legalSection
                deviceInfoSection
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "info.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.about.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - App Info

    private var appInfoSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.about.appInfo"))

            infoRow(
                icon: "number",
                label: localization.t("settings.about.version"),
                value: appVersion
            )
            infoRow(
                icon: "hammer",
                label: localization.t("settings.about.build"),
                value: buildNumber
            )
            infoRow(
                icon: "calendar",
                label: localization.t("settings.about.environment"),
                value: repos.configuration.environment.rawValue
            )
        }
    }

    // MARK: - Legal

    private var legalSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.about.legal"))

            legalRow(
                icon: "hand.raised",
                title: localization.t("settings.about.privacyPolicy")
            )
            legalRow(
                icon: "doc.text",
                title: localization.t("settings.about.termsOfService")
            )
            legalRow(
                icon: "shield.lefthalf.filled",
                title: localization.t("settings.about.cookiePolicy")
            )
            legalRow(
                icon: "doc.plaintext",
                title: localization.t("settings.about.licenses")
            )
        }
    }

    // MARK: - Device Info

    private var deviceInfoSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.about.deviceInfo"))

            infoRow(
                icon: "appletv",
                label: localization.t("settings.about.model"),
                value: deviceModel
            )
            infoRow(
                icon: "gearshape",
                label: localization.t("settings.about.osVersion"),
                value: osVersion
            )
            infoRow(
                icon: "globe",
                label: localization.t("settings.about.locale"),
                value: Locale.current.identifier
            )
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func infoRow(
        icon: String,
        label: String,
        value: String
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 48, height: 48)

            Text(label)
                .font(.system(
                    size: TVDesignTokens.FontSize.base,
                    weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func legalRow(icon: String, title: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 48, height: 48)

            Text(title)
                .font(.system(
                    size: TVDesignTokens.FontSize.base,
                    weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
