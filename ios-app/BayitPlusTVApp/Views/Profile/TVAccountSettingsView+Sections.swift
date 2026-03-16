import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAccountSettingsView + Sections

extension TVAccountSettingsView {
    // MARK: - Linked Accounts

    var linkedAccountsGroup: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("settings.linkedAccounts"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
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
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }

                settingsRow(
                    icon: "link.badge.plus",
                    title: localization.t("settings.linkAccount"),
                    subtitle: localization.t("settings.linkAccountDesc"),
                    color: DesignTokens.Secondary.s400
                ) { navigateTo(.linkAccount) }
            }

            Text(localization.t("profile.linkSignInMethods"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.leading, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Verification Section

    var verificationGroup: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("verification.title"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                HStack {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 44)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.email ?? localization.t("profile.notSet"))
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
                        Button(emailVerificationSent
                            ? localization.t("common.done")
                            : localization.t("verification.verify"))
                        {
                            Task {
                                _ = try? await repos.user.sendEmailVerification()
                                emailVerificationSent = true
                            }
                        }
                        .buttonStyle(.plain)
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                        .background(emailVerificationSent
                            ? DesignTokens.Success.default
                            : DesignTokens.Warning.default)
                        .cornerRadius(TVDesignTokens.Radius.sm)
                        .disabled(emailVerificationSent)
                    }
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

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
                            Button(localization.t("verification.verify")) {
                                navigateTo(.phoneVerification)
                            }
                            .buttonStyle(.plain)
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, TVDesignTokens.Spacing.md)
                            .padding(.vertical, TVDesignTokens.Spacing.xs)
                            .background(DesignTokens.Warning.default)
                            .cornerRadius(TVDesignTokens.Radius.sm)
                        }
                    }
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                } else {
                    settingsRow(
                        icon: "phone.badge.plus",
                        title: localization.t("settings.addPhone"),
                        subtitle: localization.t("settings.addPhoneDesc"),
                        color: DesignTokens.Info.default
                    ) { navigateTo(.phoneVerification) }
                }
            }
        }
    }

    // MARK: - Danger Zone

    var dangerZoneGroup: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("profile.dangerZone"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                settingsRow(
                    icon: "exclamationmark.triangle.fill",
                    title: localization.t("settings.exportData"),
                    subtitle: localization.t("settings.exportDataDesc"),
                    color: DesignTokens.Info.default
                ) { navigateTo(.settingsHub(category: .help)) }

                settingsRow(
                    icon: "trash.fill",
                    title: localization.t("settings.deleteAccount"),
                    subtitle: localization.t("settings.deleteAccountDesc"),
                    color: DesignTokens.Colors.Semantic.error
                ) { navigateTo(.deleteAccount) }
            }
        }
    }
}
