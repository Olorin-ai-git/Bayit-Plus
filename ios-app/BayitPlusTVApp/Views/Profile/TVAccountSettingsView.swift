import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Account security and settings screen for tvOS.
struct TVAccountSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    let profile: ProfileResponse
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void

    @State var showingChangePassword = false
    @State var showingPhoneVerification = false

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

    var securitySection: some View {
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

    // MARK: - Helpers

    func actionRow(
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

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .textCase(nil)
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
