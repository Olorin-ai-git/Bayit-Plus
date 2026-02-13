import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on ProfileView providing account info, security, and menu sections.
/// Extracted to keep ProfileView.swift under 200 lines.
extension ProfileView {

    @ViewBuilder
    func accountInfoSection(_ profile: ProfileResponse) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("profile.accountInfo"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    accountRow(
                        icon: "person.fill",
                        label: localization.t("profile.displayName"),
                        value: profile.displayName ?? ""
                    )

                    Divider().background(DesignTokens.Glass.border)

                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundColor(DesignTokens.Primary.default)
                            .frame(width: 32)

                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                            Text(localization.t("profile.email"))
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Text(profile.email ?? "")
                                    .font(.system(size: DesignTokens.FontSize.md))
                                    .foregroundColor(DesignTokens.Text.primary)
                                if profile.emailVerified == true {
                                    Image(systemName: "checkmark.seal.fill")
                                        .font(.system(size: DesignTokens.FontSize.sm))
                                        .foregroundColor(DesignTokens.Primary.default)
                                }
                            }
                        }
                        Spacer()
                    }

                    Divider().background(DesignTokens.Glass.border)

                    phoneNumberRow(profile)
                }
                .padding(DesignTokens.Spacing.md)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    func accountRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundColor(DesignTokens.Primary.default)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                Text(value)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            Spacer()
        }
    }

    func phoneNumberRow(_ profile: ProfileResponse) -> some View {
        Button {
            coordinator.pushToCurrentTab(.phoneVerification)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "phone.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundColor(DesignTokens.Primary.default)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("profile.phoneNumber"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(profile.phoneNumber ?? localization.t("profile.notSet"))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)

                        if let phoneNumber = profile.phoneNumber, !phoneNumber.isEmpty {
                            if profile.phoneVerified == true {
                                GlassBadge(text: localization.t("profile.verified"), variant: .success)
                            } else {
                                GlassBadge(text: localization.t("profile.notVerified"), variant: .warning)
                            }
                        }
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
            }
        }
    }

    @ViewBuilder
    func securitySection(_ profile: ProfileResponse) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("profile.security"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            VStack(spacing: DesignTokens.Spacing.sm) {
                if let bioVM = biometricVM, bioVM.isBiometricAvailable {
                    GlassCard {
                        HStack(spacing: DesignTokens.Spacing.md) {
                            Image(systemName: bioVM.biometricIconName)
                                .font(.system(size: DesignTokens.FontSize.lg))
                                .foregroundColor(DesignTokens.Primary.default)
                                .frame(width: 32)

                            Text(bioVM.biometricLabel)
                                .font(.system(size: DesignTokens.FontSize.md))
                                .foregroundColor(DesignTokens.Text.primary)

                            Spacer()

                            Toggle("", isOn: Binding(
                                get: { bioVM.isBiometricEnabled },
                                set: { _ in Task { await bioVM.toggleBiometric() } }
                            ))
                            .labelsHidden()
                            .tint(DesignTokens.Primary.default)
                        }
                        .padding(DesignTokens.Spacing.md)
                    }
                }

                if profile.hasPassword == true {
                    menuRow(icon: "lock.fill", title: "profile.changePassword") {
                        coordinator.pushToCurrentTab(.security)
                    }
                }

                menuRow(icon: "shield.lefthalf.filled", title: "profile.mfa") {
                    coordinator.pushToCurrentTab(.mfaSetup)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    var menuSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            menuRow(icon: "person.fill.viewfinder", title: "profile.zehAni") {
                coordinator.pushToCurrentTab(.zehAni)
            }
            menuRow(icon: "heart.fill", title: "profile.favorites") {
                coordinator.pushToCurrentTab(.favorites)
            }
            menuRow(icon: "list.bullet", title: "profile.playlist") {
                coordinator.pushToCurrentTab(.playlist)
            }
            menuRow(icon: "arrow.down.circle.fill", title: "profile.downloads") {
                coordinator.pushToCurrentTab(.downloads)
            }
            menuRow(icon: "record.circle", title: "profile.recordings") {
                coordinator.pushToCurrentTab(.recordings)
            }
            menuRow(icon: "star.fill", title: "profile.rewards") {
                coordinator.pushToCurrentTab(.rewards)
            }
            menuRow(icon: "house.lodge.fill", title: "profile.household") {
                coordinator.pushToCurrentTab(.household)
            }
            menuRow(icon: "gearshape.fill", title: "profile.settings") {
                coordinator.pushToCurrentTab(.settings)
            }
            GlassCard {
                Button {
                    Task { try? await authManager.signOut() }
                } label: {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                            .frame(width: 32)
                        Text(localization.t("profile.logout"))
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                        Spacer()
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func menuRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        GlassCard {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Primary.default)
                        .frame(width: 32)

                    Text(localization.t(title))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}
