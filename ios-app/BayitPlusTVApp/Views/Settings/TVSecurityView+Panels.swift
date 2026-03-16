#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Account Security Panel

    struct TVSecurityAccountPanel: View {
        let viewModel: SecurityViewModel?
        let profileViewModel: ProfileViewModel?
        let onChangePassword: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 28) {
                    panelSection(localization.t("settings.security.accountSecurity")) {
                        securityRow(icon: "key.fill",
                                    title: localization.t("settings.security.changePassword"),
                                    subtitle: localization.t("profile.changePasswordDesc"),
                                    showChevron: true) { onChangePassword() }
                        twoFactorRow
                        let count = viewModel?.devices.count ?? 0
                        securityRow(icon: "display",
                                    title: localization.t("settings.security.devices"),
                                    subtitle: String(format: localization.t("settings.security.deviceCount"), count),
                                    showChevron: true) {}
                    }
                    panelSection(localization.t("settings.linkedAccounts")) {
                        let email = profileViewModel?.profile?.email ?? ""
                        linkedRow(icon: "person.circle.fill", iconColor: DesignTokens.Primary.p400,
                                  title: "Email", subtitle: email.isEmpty ? "" : email,
                                  secondSubtitle: localization.t("profile.primarySignIn"),
                                  connected: !email.isEmpty)
                        linkedRow(icon: "g.circle.fill", iconColor: Color(hex: 0x4285F4),
                                  title: "Google", subtitle: localization.t("settings.not_connected"))
                        linkedRow(icon: "apple.logo", iconColor: .white,
                                  title: "Apple", subtitle: localization.t("settings.not_connected"))
                        securityRow(icon: "link",
                                    title: localization.t("settings.linkAccount"),
                                    subtitle: localization.t("settings.linkAccountDesc"),
                                    showChevron: true, isAccent: true) {}
                    }
                }
                .padding(.horizontal, 56)
                .padding(.vertical, 56)
            }
        }

        // MARK: - Two-Factor Row

        private var twoFactorRow: some View {
            HStack(spacing: 20) {
                ZStack(alignment: .bottomTrailing) {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(DesignTokens.Success.default)
                        .offset(x: 5, y: 5)
                }
                .frame(width: 38, height: 38)
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("settings.security.twoFactor"))
                        .font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("settings.security.twoFactorDesc"))
                        .font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                }
                Spacer(minLength: 0)
                Text(localization.t("common.enabled"))
                    .font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                    .padding(.horizontal, 16).padding(.vertical, 7)
                    .background(DesignTokens.Success.default.opacity(0.22))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(DesignTokens.Success.default.opacity(0.55), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.09), lineWidth: 1))
        }

        // MARK: - Helpers

        private func panelSection<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
            VStack(alignment: .leading, spacing: 12) {
                Text(title).font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400).textCase(.uppercase).tracking(1.4)
                content()
            }
        }

        private func securityRow(icon: String, title: String, subtitle: String,
                                 showChevron: Bool = false, isAccent: Bool = false,
                                 action: @escaping () -> Void) -> some View
        {
            Button(action: action) {
                HStack(spacing: 20) {
                    Image(systemName: icon).font(.system(size: 22, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400).frame(width: 38)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title).font(.system(size: 26, weight: .medium))
                            .foregroundStyle(isAccent ? DesignTokens.Primary.p400 : DesignTokens.Text.primary)
                        Text(subtitle).font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if showChevron {
                        Image(systemName: "chevron.right")
                            .foregroundStyle(isAccent ? DesignTokens.Primary.p400 : DesignTokens.Text.secondary)
                    }
                }
                .padding(.horizontal, 28).padding(.vertical, 22)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.09), lineWidth: 1))
            }
            .tvCardStyle()
        }

        private func linkedRow(icon: String, iconColor: Color = DesignTokens.Primary.p400,
                               title: String, subtitle: String, secondSubtitle: String? = nil,
                               connected: Bool = false) -> some View
        {
            HStack(spacing: 20) {
                Image(systemName: icon).font(.system(size: 24, weight: .medium))
                    .foregroundStyle(iconColor).frame(width: 38)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                    if !subtitle.isEmpty {
                        Text(subtitle).font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                    }
                    if let second = secondSubtitle {
                        Text(second).font(.system(size: 18)).foregroundStyle(DesignTokens.Text.muted).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                if connected {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 26)).foregroundStyle(DesignTokens.Success.default)
                } else {
                    HStack(spacing: 6) {
                        Text(localization.t("settings.not_connected"))
                            .font(.system(size: 20)).foregroundStyle(DesignTokens.Text.muted)
                        Image(systemName: "chevron.right").font(.system(size: 16))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.09), lineWidth: 1))
        }
    }
#endif
