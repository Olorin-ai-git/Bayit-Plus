import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAccountSettingsView + Sections

extension TVAccountSettingsView {
    // MARK: - Linked Accounts

    var linkedAccountsSection: some View {
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

    var verificationSection: some View {
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

    var dangerZoneSection: some View {
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
}
