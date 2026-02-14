import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Account security and settings screen for tvOS.
struct TVAccountSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    let profile: ProfileResponse
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void

    @State private var showingChangePassword = false
    @State private var showingPhoneVerification = false

    var body: some View {
        NavigationStack {
            List {
                securitySection
                linkedAccountsSection
                verificationSection
                dangerZoneSection
            }
            .listStyle(.grouped)
            .navigationTitle("Account Security")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        onDismiss()
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
    }

    // MARK: - Security Section

    private var securitySection: some View {
        Section {
            if profile.hasPassword == true {
                actionRow(
                    icon: "key.fill",
                    title: "Change Password",
                    subtitle: "Update your account password",
                    color: DesignTokens.Primary.p400
                ) {
                    showingChangePassword = true
                }
            } else {
                actionRow(
                    icon: "key.fill",
                    title: "Set Password",
                    subtitle: "Add password to your account",
                    color: DesignTokens.Warning.default
                ) {
                    showingChangePassword = true
                }
            }

            actionRow(
                icon: "lock.shield.fill",
                title: "Two-Factor Authentication",
                subtitle: "Add extra security to your account",
                color: DesignTokens.Success.default
            ) {
                // Navigate to 2FA setup
            }

            actionRow(
                icon: "key.viewfinder",
                title: "Active Sessions",
                subtitle: "Manage devices signed into your account",
                color: DesignTokens.Info.default
            ) {
                // Navigate to active sessions
            }
        } header: {
            sectionHeader("Security")
        }
    }

    // MARK: - Linked Accounts

    private var linkedAccountsSection: some View {
        Section {
            if let provider = profile.authProvider {
                HStack {
                    Image(systemName: providerIcon(provider))
                        .font(.system(size: 28))
                        .foregroundStyle(providerColor(provider))
                        .frame(width: 44)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(provider.capitalized)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("profile.primarySignIn"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Spacer()

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Success.default)
                }
            }

            actionRow(
                icon: "link.badge.plus",
                title: "Link Another Account",
                subtitle: "Connect Google, Apple ID, or Facebook",
                color: DesignTokens.Secondary.s400
            ) {
                // Navigate to link account
            }
        } header: {
            sectionHeader("Linked Accounts")
        } footer: {
            Text(localization.t("profile.linkSignInMethods"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Verification Section

    private var verificationSection: some View {
        Section {
            HStack {
                Image(systemName: "envelope.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(profile.email ?? "No email")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("profile.emailAddress"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()

                if profile.emailVerified == true {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 20))
                        Text(localization.t("profile.verified"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    }
                    .foregroundStyle(DesignTokens.Success.default)
                } else {
                    Button("Verify") {
                        // Trigger email verification
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(DesignTokens.Warning.default)
                    .cornerRadius(TVDesignTokens.Radius.sm)
                }
            }

            if let phone = profile.phoneNumber {
                HStack {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 44)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(phone)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("profile.phoneNumber"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Spacer()

                    if profile.phoneVerified == true {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 20))
                            Text(localization.t("profile.verified"))
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        }
                        .foregroundStyle(DesignTokens.Success.default)
                    } else {
                        Button("Verify") {
                            showingPhoneVerification = true
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                        .background(DesignTokens.Warning.default)
                        .cornerRadius(TVDesignTokens.Radius.sm)
                    }
                }
            } else {
                actionRow(
                    icon: "phone.badge.plus",
                    title: "Add Phone Number",
                    subtitle: "Add a phone number for recovery",
                    color: DesignTokens.Info.default
                ) {
                    // Add phone number
                }
            }
        } header: {
            sectionHeader("Verification")
        }
    }

    // MARK: - Danger Zone

    private var dangerZoneSection: some View {
        Section {
            actionRow(
                icon: "exclamationmark.triangle.fill",
                title: "Export My Data",
                subtitle: "Download all your data",
                color: DesignTokens.Info.default
            ) {
                // Export data
            }

            actionRow(
                icon: "trash.fill",
                title: "Delete Account",
                subtitle: "Permanently delete your account and data",
                color: DesignTokens.Colors.Semantic.error
            ) {
                // Show delete confirmation
            }
        } header: {
            sectionHeader("Danger Zone")
        }
    }

    // MARK: - Helpers

    private func actionRow(
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
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .textCase(nil)
    }

    private func providerIcon(_ provider: String) -> String {
        switch provider.lowercased() {
        case "google": return "g.circle.fill"
        case "apple": return "apple.logo"
        case "facebook": return "f.circle.fill"
        default: return "person.circle.fill"
        }
    }

    private func providerColor(_ provider: String) -> Color {
        switch provider.lowercased() {
        case "google": return DesignTokens.ErrorColor.e400
        case "apple": return DesignTokens.Text.primary
        case "facebook": return DesignTokens.Info.default
        default: return DesignTokens.Primary.p400
        }
    }
}
