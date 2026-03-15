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
                VStack(alignment: .leading, spacing: 32) {
                    panelSection(localization.t("settings.security.accountSecurity")) {
                        securityRow(
                            icon: "key.fill",
                            title: localization.t("settings.security.changePassword"),
                            subtitle: localization.t("profile.changePasswordDesc"),
                            showChevron: true
                        ) { onChangePassword() }
                        twoFactorRow
                        let count = viewModel?.devices.count ?? 0
                        securityRow(
                            icon: "display",
                            title: localization.t("settings.security.devices"),
                            subtitle: "\(count) \(count == 1 ? "device" : "devices")",
                            showChevron: true
                        ) {}
                    }
                    panelSection(localization.t("settings.linkedAccounts")) {
                        let email = profileViewModel?.profile?.email ?? ""
                        linkedRow(
                            icon: "envelope.fill", title: "Email",
                            subtitle: email.isEmpty ? localization.t("settings.not_connected") : email,
                            connected: !email.isEmpty
                        )
                        linkedRow(icon: "g.circle.fill", title: "Google",
                                  subtitle: localization.t("settings.not_connected"))
                        linkedRow(icon: "apple.logo", title: "Apple",
                                  subtitle: localization.t("settings.not_connected"))
                        securityRow(
                            icon: "plus.circle.fill",
                            title: localization.t("settings.linkAccount"),
                            subtitle: localization.t("settings.linkAccountDesc"),
                            showChevron: true
                        ) {}
                    }
                }
                .padding(.horizontal, 48)
                .padding(.vertical, 48)
            }
        }

        private var twoFactorRow: some View {
            HStack(spacing: 20) {
                Image(systemName: "shield.checkmark.fill")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("settings.security.twoFactor"))
                        .font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("settings.security.twoFactorDesc"))
                        .font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                }
                Spacer(minLength: 0)
                Text("Enabled")
                    .font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                    .padding(.horizontal, 14).padding(.vertical, 6)
                    .background(Color.green.opacity(0.25))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.green.opacity(0.6), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }

        private func panelSection<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
            VStack(alignment: .leading, spacing: 12) {
                Text(title).font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary).textCase(.uppercase).tracking(1.2)
                content()
            }
        }

        private func securityRow(icon: String, title: String, subtitle: String,
                                 showChevron: Bool = false, action: @escaping () -> Void) -> some View
        {
            Button(action: action) {
                HStack(spacing: 20) {
                    Image(systemName: icon).font(.system(size: 22, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400).frame(width: 36)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title).font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle).font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if showChevron {
                        Image(systemName: "chevron.right").foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
                .padding(.horizontal, 28).padding(.vertical, 22)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .tvCardStyle()
        }

        private func linkedRow(icon: String, title: String, subtitle: String, connected: Bool = false) -> some View {
            HStack(spacing: 20) {
                Image(systemName: icon).font(.system(size: 22, weight: .medium))
                    .foregroundStyle(connected ? DesignTokens.Primary.p400 : DesignTokens.Text.secondary)
                    .frame(width: 36)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                    Text(subtitle).font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary).lineLimit(1)
                }
                Spacer(minLength: 0)
                if connected {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 22)).foregroundStyle(.green)
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    // MARK: - Devices Panel

    struct TVSecurityDevicesPanel: View {
        let viewModel: SecurityViewModel?

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    Text(localization.t("settings.security.devices"))
                        .font(.system(size: 32, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
                        .padding(.bottom, 8)
                    if let devices = viewModel?.devices, !devices.isEmpty {
                        ForEach(devices) { deviceRow($0) }
                    } else {
                        Text(localization.t("settings.security.noDevices"))
                            .font(.system(size: 24)).foregroundStyle(DesignTokens.Text.secondary)
                            .frame(maxWidth: .infinity).padding(.vertical, 60)
                    }
                }
                .padding(.horizontal, 48).padding(.vertical, 48)
            }
        }

        private func deviceRow(_ device: DeviceInfo) -> some View {
            HStack(spacing: 20) {
                Image(systemName: icon(for: device.deviceType))
                    .font(.system(size: 28, weight: .medium)).foregroundStyle(DesignTokens.Primary.p400).frame(width: 44)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 10) {
                        Text(device.deviceName ?? localization.t("settings.security.unknownDevice"))
                            .font(.system(size: 26, weight: .medium)).foregroundStyle(DesignTokens.Text.primary)
                        if device.isCurrent == true {
                            GlassBadge(text: localization.t("settings.security.thisDevice"), variant: .success)
                        }
                    }
                    Text(device.lastActive ?? "").font(.system(size: 20)).foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer(minLength: 0)
                if device.isCurrent != true {
                    Button { Task { await viewModel?.removeDevice(device) } } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28)).foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                    .tvCardStyle()
                }
            }
            .padding(.horizontal, 28).padding(.vertical, 22)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }

        private func icon(for type: String?) -> String {
            switch type {
            case "mobile": return "iphone"
            case "tablet": return "ipad"
            case "tv": return "appletv"
            case "desktop": return "desktopcomputer"
            default: return "display"
            }
        }
    }
#endif
