import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Account security and settings screen for tvOS.
struct TVAccountSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos
    let profile: ProfileResponse
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void
    let onNavigate: (TVProfileDestination) -> Void

    @State var emailVerificationSent = false

    var body: some View {
        VStack(spacing: 0) {
            TVProfileSheetHeader(
                title: localization.t("profile.accountSecurity"),
                onDismiss: onDismiss
            )

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    securityGroup
                    linkedAccountsGroup
                    verificationGroup
                    dangerZoneGroup
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
    }

    // MARK: - Security Section

    private var securityGroup: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("profile.security"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if profile.hasPassword == true {
                    settingsRow(
                        icon: "key.fill",
                        title: localization.t("profile.changePassword"),
                        subtitle: localization.t("profile.updatePassword"),
                        color: DesignTokens.Primary.p400
                    ) { navigateTo(.changePassword) }
                } else {
                    settingsRow(
                        icon: "key.fill",
                        title: localization.t("settings.setPassword"),
                        subtitle: localization.t("settings.setPasswordDesc"),
                        color: DesignTokens.Warning.default
                    ) { navigateTo(.changePassword) }
                }

                settingsRow(
                    icon: "lock.shield.fill",
                    title: localization.t("profile.twoFactorAuth"),
                    subtitle: localization.t("profile.addExtraSecurity"),
                    color: DesignTokens.Success.default
                ) { navigateTo(.passkeys) }

                settingsRow(
                    icon: "key.viewfinder",
                    title: localization.t("profile.connectedDevices"),
                    subtitle: localization.t("profile.manageDevices"),
                    color: DesignTokens.Info.default
                ) { navigateTo(.activeSessions) }
            }
        }
    }

    // MARK: - Helpers

    func navigateTo(_ sheet: TVProfileDestination) {
        onDismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            onNavigate(sheet)
        }
    }

    func settingsRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(color)
                    .frame(width: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.leading, TVDesignTokens.Spacing.sm)
    }

    func providerIcon(_ provider: String) -> String {
        switch provider.lowercased() {
        case "google": return "g.circle.fill"
        case "apple": return "apple.logo"
        case "facebook": return "f.circle.fill"
        default: return "person.circle.fill"
        }
    }

    func providerColor(_ provider: String) -> Color {
        switch provider.lowercased() {
        case "google": return DesignTokens.ErrorColor.e400
        case "apple": return DesignTokens.Text.primary
        case "facebook": return DesignTokens.Info.default
        default: return DesignTokens.Primary.p400
        }
    }
}
